'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabase } from './supabase';
import {
  ANSWER_SECONDS, clone, initialState, syncPlayers, startGame, currentTurnId, localJudge, applyResult,
  vetoOutcome, acceptVeto, advanceTurn, boardDone, revancheOutcome, startRevanche, backToLobby,
} from './engine';
import { imposterInitial, imposterAction, imposterTick } from './imposter';
import { memeInitial, memeAction, memeTick } from './meme';
import { drawInitial, drawAction, drawTick } from './draw';
import { bluffInitial, bluffAction, bluffTick, bluffLoaded } from './bluff';
import { emojiInitial, emojiAction, emojiTick } from './emoji';
import { estInitial, estAction, estTick } from './estimate';
import { shopState, applyBought, resetBought } from './shopGame';
import { addBot, removeBot, botPlans } from './bots';

function presenceList(channel) {
  const st = channel.presenceState();
  return Object.values(st)
    .map((arr) => arr[0])
    .filter(Boolean)
    .sort((a, b) => a.joinedAt - b.joinedAt);
}

export function useRoom({ code, me, isCreator, game = 'quiz' }) {
  const [state, setState] = useState(null);
  const [presence, setPresence] = useState([]);
  const [messages, setMessages] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [conn, setConn] = useState('connecting'); // connecting | ok | error | missing
  const [connError, setConnError] = useState('');
  const stateRef = useRef(null);
  const presenceRef = useRef([]);
  const channelRef = useRef(null);
  const offsetRef = useRef(0);
  const loadingRef = useRef(false);
  const hostMissingRef = useRef(null);
  const poolRef = useRef({ key: null, map: {}, promise: null }); // vorgeladene Fragen fürs aktuelle Board (nur beim Host)
  const meRef = useRef(me);
  meRef.current = me;
  const memeTplRef = useRef(null); // Meme-Vorlagen (nur beim Host gebraucht)
  const drawSubs = useRef(new Set()); // Zeichenspiel: Empfänger für Striche
  const bluffLoading = useRef(false); // Lügen-Quiz: Host lädt gerade Fragen
  const botDue = useRef(new Map()); // Dev-Mode-Bots: geplanter Zeitpunkt je Aktion
  const botDone = useRef(new Set()); // Dev-Mode-Bots: schon ausgeführte Aktionen

  const amHost = () => stateRef.current && stateRef.current.hostId === meRef.current.id;

  const commit = useCallback((next) => {
    next.v = (stateRef.current?.v || 0) + 1;
    next.sentAt = Date.now();
    stateRef.current = next;
    offsetRef.current = 0;
    setState(next);
    channelRef.current?.send({ type: 'broadcast', event: 'state', payload: next });
  }, []);

  // ---------- Host: Fragen fürs ganze Board vorladen ----------
  const boardKey = (s) => (s?.board ? s.round + '|' + s.board.categories.map((c) => c.name).join(',') : null);

  const prefetchBoard = useCallback((s) => {
    const key = boardKey(s);
    if (!key || poolRef.current.key === key) return;
    const pool = { key, map: {}, promise: null };
    poolRef.current = pool;
    pool.promise = fetch('/api/board', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ categories: s.board.categories.map((c) => c.name) }),
    })
      .then((r) => r.json())
      .then((d) => { if (d && d.questions) pool.map = d.questions; })
      .catch(() => {})
      .finally(() => { pool.promise = null; });
  }, []);

  const takeFromPool = (s, cat, row) => {
    const pool = poolRef.current;
    if (pool.key !== boardKey(s)) return null;
    const arr = pool.map[cat + '-' + row] || [];
    while (arr.length) {
      const q = arr.shift();
      if (q && !s.asked.includes(q.question)) return q;
    }
    return null;
  };

  const setAsking = (s, q) => {
    s.current.q = q;
    s.current.status = 'asking';
    s.current.deadline = Date.now() + ANSWER_SECONDS * 1000;
    s.asked = [...s.asked, q.question].slice(-80);
  };

  // ---------- Host: Frage laden ----------
  const loadQuestion = useCallback(async () => {
    if (loadingRef.current) return;
    const s = stateRef.current;
    const c = s?.current;
    if (!c || c.status !== 'loading') return;
    loadingRef.current = true;
    const key = c.cat + '-' + c.row;
    try {
      // Läuft das Vorladen noch? Dann kurz darauf warten – meist ist die Frage danach sofort da.
      const pending = poolRef.current.key === boardKey(s) ? poolRef.current.promise : null;
      if (pending) await Promise.race([pending, new Promise((r) => setTimeout(r, 20000))]);
      {
        const s2 = clone(stateRef.current);
        const c2 = s2.current;
        if (!c2 || c2.status !== 'loading' || c2.cat + '-' + c2.row !== key) return;
        const pq = takeFromPool(s2, c2.cat, c2.row);
        if (pq) { setAsking(s2, pq); commit(s2); return; }
      }
      const res = await fetch('/api/question', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ category: s.board.categories[c.cat].name, level: c.row + 1, avoid: s.asked }),
      });
      const q = await res.json();
      if (!res.ok || q.error) throw new Error(q.error || 'Fehler beim Laden');
      const s2 = clone(stateRef.current);
      const c2 = s2.current;
      if (!c2 || c2.status !== 'loading' || c2.cat + '-' + c2.row !== key) return;
      setAsking(s2, q);
      commit(s2);
    } catch (e) {
      const s2 = clone(stateRef.current);
      if (s2.current && s2.current.status === 'loading') {
        s2.current.status = 'error';
        s2.current.error = String(e.message || e);
        commit(s2);
      }
    } finally {
      loadingRef.current = false;
    }
  }, [commit]);

  // ---------- Host: Aktionen verarbeiten ----------
  const handleAction = useCallback(async (a) => {
    const s0 = stateRef.current;
    if (!s0 || !amHost()) return;
    // Gekaufte Joker: Host-Schalter und Einsatz gelten für alle Spiele
    if (a.type === 'shopAllow') {
      if (a.playerId !== s0.hostId) return;
      const sa = clone(s0);
      shopState(sa).allow = !!a.on;
      return commit(sa);
    }
    // Dev-Mode: Bots hinzufügen / entfernen (nur Host, nur in der Lobby)
    if (a.type === 'addBot' || a.type === 'removeBot') {
      if (a.playerId !== s0.hostId || s0.phase !== 'lobby') return;
      const sb = clone(s0);
      if (a.type === 'addBot') { if (Object.keys(sb.players).length >= 12) return; addBot(sb); }
      else if (!removeBot(sb, a.id)) return;
      return commit(sb);
    }
    if (a.type === 'useBought') {
      const su = clone(s0);
      if (applyBought(su, a.playerId, a.item)) commit(su);
      return;
    }
    const GAMES = {
      imposter: (x) => imposterAction(x, a),
      estimate: (x) => estAction(x, a),
      emoji: (x) => emojiAction(x, a),
      bluff: (x) => bluffAction(x, a),
      draw: (x) => drawAction(x, a),
      meme: (x) => memeAction(x, a, memeTplRef.current),
    };
    if (GAMES[s0.game]) {
      const sg = clone(s0);
      if (GAMES[s0.game](sg)) {
        if (a.type === 'start') resetBought(sg); // neues Spiel → wieder 1 gekaufter Joker frei
        commit(sg);
      }
      return;
    }
    const s = clone(s0);
    const pid = a.playerId;
    const c = s.current;
    switch (a.type) {
      case 'voteMode':
        if (s.phase !== 'lobby') return;
        s.modeVotes[pid] = a.mode;
        return commit(s);
      case 'start':
        if (pid !== s.hostId || s.phase !== 'lobby' || s.order.length < 1) return;
        startGame(s);
        resetBought(s);
        return commit(s);
      case 'pick': {
        if (s.phase !== 'board' || currentTurnId(s) !== pid) return;
        const tile = s.board.tiles[a.cat]?.[a.row];
        if (!tile || tile.used) return;
        s.phase = 'question';
        s.current = { cat: a.cat, row: a.row, value: tile.value, playerId: pid, status: 'loading', q: null, used: { hint: false, choices: false }, vetoVotes: {} };
        const pq = takeFromPool(s, a.cat, a.row);
        if (pq) { setAsking(s, pq); return commit(s); }
        commit(s);
        return loadQuestion();
      }
      case 'retry':
        if (!c || c.status !== 'error') return;
        c.status = 'loading';
        commit(s);
        return loadQuestion();
      case 'joker': {
        if (!c || c.status !== 'asking' || c.playerId !== pid) return;
        const p = s.players[pid];
        if (!p || !p.jokers[a.kind]) return;
        p.jokers[a.kind] = false;
        if (a.kind === 'hint') c.used.hint = true;
        if (a.kind === 'choices') c.used.choices = true;
        if (a.kind === 'swap') {
          c.swapped = true;
          c.used = { hint: false, choices: false };
          const pq = takeFromPool(s, c.cat, c.row);
          if (pq) { setAsking(s, pq); return commit(s); }
          c.status = 'loading';
          c.q = null;
          commit(s);
          return loadQuestion();
        }
        return commit(s);
      }
      case 'answer': {
        if (!c || c.status !== 'asking' || c.playerId !== pid) return;
        c.given = String(a.text || '').slice(0, 120);
        c.status = 'judging';
        commit(s);
        let ok = localJudge(c.given, c.q, c.used.choices);
        if (ok === null) {
          try {
            const r = await fetch('/api/judge', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ question: c.q.question, answer: c.q.answer, aliases: c.q.aliases, given: c.given }),
            });
            ok = (await r.json()).correct === true;
          } catch {
            ok = false;
          }
        }
        const s2 = clone(stateRef.current);
        if (s2.current?.status !== 'judging') return;
        applyResult(s2, ok);
        return commit(s2);
      }
      case 'veto': {
        if (!c || c.status !== 'result' || c.correct || c.timedOut || c.playerId !== pid || c.vetoResult) return;
        c.status = 'veto';
        c.vetoVotes = {};
        if (vetoOutcome(s) === 'accept') acceptVeto(s);
        return commit(s);
      }
      case 'vetoVote': {
        if (!c || c.status !== 'veto' || pid === c.playerId) return;
        c.vetoVotes[pid] = !!a.yes;
        const o = vetoOutcome(s);
        if (o === 'accept') acceptVeto(s);
        if (o === 'reject') { c.status = 'result'; c.vetoResult = 'rejected'; }
        return commit(s);
      }
      case 'next': {
        if (!c || c.status !== 'result') return;
        if (pid !== c.playerId && pid !== s.hostId) return;
        s.current = null;
        advanceTurn(s);
        if (boardDone(s)) { s.phase = 'end'; s.revanche = {}; s.final = false; } else s.phase = 'board';
        return commit(s);
      }
      case 'revanche': {
        if (s.phase !== 'end' || s.final) return;
        s.revanche[pid] = !!a.yes;
        const o = revancheOutcome(s);
        if (o === 'yes') startRevanche(s);
        if (o === 'no') s.final = true;
        return commit(s);
      }
      case 'lobby':
        if (pid !== s.hostId) return;
        backToLobby(s);
        return commit(s);
      default:
    }
  }, [commit, loadQuestion]);

  const handleRef = useRef(handleAction);
  handleRef.current = handleAction;

  // Host: auf Spieleränderungen reagieren
  const hostSync = useCallback(() => {
    if (!amHost()) return;
    const s = clone(stateRef.current);
    let changed = syncPlayers(s, presenceRef.current);
    if (s.current?.status === 'veto') {
      const o = vetoOutcome(s);
      if (o === 'accept') { acceptVeto(s); changed = true; }
      if (o === 'reject') { s.current.status = 'result'; s.current.vetoResult = 'rejected'; changed = true; }
    }
    if (s.phase === 'end' && !s.final) {
      const o = revancheOutcome(s);
      if (o === 'yes') { startRevanche(s); changed = true; }
      if (o === 'no') { s.final = true; changed = true; }
    }
    if (changed) commit(s);
  }, [commit]);

  // ---------- Verbindung ----------
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) { setConn('error'); return; }
    const joinedAt = Date.now();
    const channel = supabase.channel('quizabend-' + code, {
      config: { presence: { key: me.id }, broadcast: { self: false, ack: false } },
    });
    channelRef.current = channel;

    channel.on('presence', { event: 'sync' }, () => {
      const list = presenceList(channel);
      presenceRef.current = list;
      setPresence(list);
      hostSync();
    });
    channel.on('broadcast', { event: 'state' }, ({ payload }) => {
      if (!payload) return;
      const cur = stateRef.current;
      if (cur && payload.v < cur.v && payload.hostId === cur.hostId) return;
      offsetRef.current = Date.now() - payload.sentAt;
      stateRef.current = payload;
      setState(payload);
      setConn('ok');
    });
    channel.on('broadcast', { event: 'hello' }, () => {
      if (amHost()) {
        const s = stateRef.current;
        s.sentAt = Date.now();
        channel.send({ type: 'broadcast', event: 'state', payload: s });
      }
    });
    channel.on('broadcast', { event: 'action' }, ({ payload }) => {
      if (amHost()) handleRef.current(payload);
    });
    channel.on('broadcast', { event: 'chat' }, ({ payload }) => {
      setMessages((m) => [...m, payload].slice(-60));
    });
    channel.on('broadcast', { event: 'draw' }, ({ payload }) => {
      if (payload) drawSubs.current.forEach((fn) => fn(payload));
    });
    channel.on('broadcast', { event: 'react' }, ({ payload }) => {
      setReactions((r) => [...r, payload].slice(-20));
    });

    let initTimer, missingTimer, failTimer;
    let subscribed = false;
    // Erst nach 12 Sekunden ohne Verbindung einen Fehler zeigen (kurze Aussetzer repariert Supabase selbst)
    failTimer = setTimeout(() => { if (!subscribed) setConn('error'); }, 12000);
    channel.subscribe(async (status, err) => {
      if (status === 'SUBSCRIBED') {
        subscribed = true;
        clearTimeout(failTimer);
        setConnError('');
        setConn((c) => (c === 'error' ? 'connecting' : c));
        await channel.track({ id: me.id, name: me.name, avatar: me.avatar, joinedAt });
        channel.send({ type: 'broadcast', event: 'hello', payload: { id: me.id } });
        initTimer = setTimeout(() => {
          if (!stateRef.current && isCreator) {
            const s = game === 'imposter' ? imposterInitial(me.id) : game === 'meme' ? memeInitial(me.id) : game === 'draw' ? drawInitial(me.id) : game === 'bluff' ? bluffInitial(me.id) : game === 'emoji' ? emojiInitial(me.id) : game === 'estimate' ? estInitial(me.id) : initialState(me.id);
            syncPlayers(s, presenceRef.current.length ? presenceRef.current : [{ id: me.id, name: me.name, avatar: me.avatar, joinedAt }]);
            commit(s);
            setConn('ok');
          }
        }, 1500);
        missingTimer = setTimeout(() => {
          if (!stateRef.current) setConn('missing');
        }, 6000);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        subscribed = false;
        setConnError(status + (err ? ': ' + (err.message || String(err)) : ''));
        clearTimeout(failTimer);
        failTimer = setTimeout(() => { if (!subscribed) setConn('error'); }, 8000);
      }
    });

    return () => {
      clearTimeout(initTimer);
      clearTimeout(missingTimer);
      clearTimeout(failTimer);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, me.id]);

  // Meme-Vorlagen laden (falls dieser Spieler Host ist oder wird)
  const isMeme = state?.game === 'meme' || game === 'meme';
  useEffect(() => {
    if (!isMeme || memeTplRef.current) return;
    fetch('/api/memes').then((r) => r.json()).then((d) => { if (d.templates?.length) memeTplRef.current = d.templates; }).catch(() => {});
  }, [isMeme]);

  // Host: sobald ein Board steht, alle Fragen dafür vorladen
  useEffect(() => {
    if (state && state.hostId === me.id && state.board && (state.phase === 'board' || state.phase === 'question')) prefetchBoard(state);
  }, [state, me.id, prefetchBoard]);

  // Profiländerungen (Name/Avatar) live übernehmen
  useEffect(() => {
    const ch = channelRef.current;
    if (ch && conn === 'ok') ch.track({ id: me.id, name: me.name, avatar: me.avatar, joinedAt: presenceRef.current.find((p) => p.id === me.id)?.joinedAt || Date.now() });
  }, [me.name, me.avatar, me.id, conn]);

  // Host-Timer + Host-Übernahme, falls der Host weg ist
  useEffect(() => {
    const t = setInterval(() => {
      const s = stateRef.current;
      if (!s) return;
      if (amHost()) {
        // Dev-Mode-Bots: fällige Aktionen ausführen (jede genau einmal)
        const plans = botPlans(s);
        if (plans.length) {
          const nowT = Date.now();
          for (const p of plans) {
            if (botDone.current.has(p.key)) continue;
            if (!botDue.current.has(p.key)) { botDue.current.set(p.key, nowT + p.delay); continue; }
            if (nowT >= botDue.current.get(p.key)) {
              botDone.current.add(p.key);
              botDue.current.delete(p.key);
              handleRef.current({ ...p.action, playerId: p.pid });
            }
          }
          if (botDone.current.size > 3000) botDone.current = new Set([...botDone.current].slice(-1000));
        }
        if (s.game === 'bluff' && s.phase === 'loading' && !bluffLoading.current) {
          bluffLoading.current = true;
          fetch('/api/bluff', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ topics: s.settings.topics, count: s.settings.count, exclude: s.usedQs }),
          })
            .then((r) => r.json())
            .then((d) => {
              const s2 = clone(stateRef.current);
              if (s2.phase !== 'loading') return;
              if (d.questions?.length) bluffLoaded(s2, d.questions);
              else { s2.phase = 'lobby'; s2.error = d.error || 'Keine Fragen bekommen'; }
              commit(s2);
            })
            .catch((e) => {
              const s2 = clone(stateRef.current);
              if (s2.phase === 'loading') { s2.phase = 'lobby'; s2.error = String(e.message || e); commit(s2); }
            })
            .finally(() => { bluffLoading.current = false; });
          return;
        }
        if (s.game === 'imposter' || s.game === 'meme' || s.game === 'draw' || s.game === 'bluff' || s.game === 'emoji' || s.game === 'estimate') {
          const si = clone(s);
          const tick = s.game === 'meme' ? memeTick : s.game === 'draw' ? drawTick : s.game === 'bluff' ? bluffTick : s.game === 'emoji' ? emojiTick : s.game === 'estimate' ? estTick : imposterTick;
          if (tick(si)) commit(si);
          return;
        }
        const c = s.current;
        if (s.phase === 'question' && c?.status === 'asking' && Date.now() > c.deadline) {
          const s2 = clone(s);
          s2.current.given = '';
          applyResult(s2, false, true);
          commit(s2);
        }
        if (c?.status === 'loading' && !loadingRef.current) loadQuestion();
        return;
      }
      const ids = presenceRef.current.map((p) => p.id);
      if (ids.length && !ids.includes(s.hostId)) {
        if (!hostMissingRef.current) hostMissingRef.current = Date.now();
        if (Date.now() - hostMissingRef.current > 4000) {
          const next = s.order.find((id) => ids.includes(id));
          if (next === meRef.current.id) {
            const s2 = clone(s);
            s2.hostId = meRef.current.id;
            syncPlayers(s2, presenceRef.current);
            commit(s2);
            hostMissingRef.current = null;
          }
        }
      } else hostMissingRef.current = null;
    }, 500);
    return () => clearInterval(t);
  }, [commit, loadQuestion]);

  const send = useCallback((type, data = {}) => {
    const a = { ...data, type, playerId: meRef.current.id };
    if (amHost()) handleRef.current(a);
    else channelRef.current?.send({ type: 'broadcast', event: 'action', payload: a });
  }, []);

  const sendChat = useCallback((text) => {
    const msg = { id: Math.random().toString(36).slice(2), pid: meRef.current.id, name: meRef.current.name, avatar: meRef.current.avatar, text: String(text).slice(0, 200), at: Date.now() };
    setMessages((m) => [...m, msg].slice(-60));
    channelRef.current?.send({ type: 'broadcast', event: 'chat', payload: msg });
  }, []);

  const sendReaction = useCallback((emoji) => {
    const r = { id: Math.random().toString(36).slice(2), pid: meRef.current.id, emoji, x: 10 + Math.random() * 80 };
    setReactions((x) => [...x, r].slice(-20));
    channelRef.current?.send({ type: 'broadcast', event: 'react', payload: r });
  }, []);

  const now = useCallback(() => Date.now() - offsetRef.current, []);

  // Zeichenspiel: Striche direkt an alle schicken (nicht über den Host-Zustand)
  const sendDraw = useCallback((payload) => {
    channelRef.current?.send({ type: 'broadcast', event: 'draw', payload });
  }, []);
  const subscribeDraw = useCallback((fn) => {
    drawSubs.current.add(fn);
    return () => drawSubs.current.delete(fn);
  }, []);

  return { state, presence, messages, reactions, conn, connError, send, sendChat, sendReaction, now, sendDraw, subscribeDraw };
}
