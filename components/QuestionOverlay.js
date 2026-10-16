'use client';
import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import Avatar from './Avatar';
import { CAT_COLORS } from './Board';
import { ANSWER_SECONDS, vetoVoters } from '@/lib/engine';
import { sfx } from '@/lib/sound';

const THINKING = ['Quizmaster denkt nach …', 'Frage wird gemischt …', 'Würfel rollen …', 'Gleich wird’s knifflig …'];

export default function QuestionOverlay({ room, me }) {
  const { state, send, now } = room;
  const c = state.current;
  const cat = state.board.categories[c.cat];
  const player = state.players[c.playerId];
  const mine = c.playerId === me.id;
  const isHost = state.hostId === me.id;
  const [text, setText] = useState('');
  const [left, setLeft] = useState(ANSWER_SECONDS);
  const [thinkIdx, setThinkIdx] = useState(0);
  const lastStatus = useRef(null);
  const lastTick = useRef(null);
  const inputRef = useRef(null);

  // Countdown
  useEffect(() => {
    if (c.status !== 'asking') return;
    const t = setInterval(() => {
      const l = Math.max(0, (c.deadline - now()) / 1000);
      setLeft(l);
      const s = Math.ceil(l);
      if (s <= 5 && s > 0 && lastTick.current !== s) { lastTick.current = s; sfx.tick(); }
    }, 200);
    return () => clearInterval(t);
  }, [c.status, c.deadline, now]);

  useEffect(() => {
    if (c.status !== 'loading') return;
    const t = setInterval(() => setThinkIdx((i) => (i + 1) % THINKING.length), 1100);
    return () => clearInterval(t);
  }, [c.status]);

  // Neue Frage (z. B. nach Tausch-Joker): Eingabe leeren
  const qText = c.q?.question;
  useEffect(() => {
    if (!qText) return;
    setText('');
    lastTick.current = null;
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [qText]);

  // Effekte bei Statuswechsel
  useEffect(() => {
    if (lastStatus.current === c.status) return;
    const prev = lastStatus.current;
    lastStatus.current = c.status;
    if (c.status === 'asking') {
      setText('');
      lastTick.current = null;
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (c.status === 'result' && (prev === 'judging' || prev === 'asking' || prev === 'veto' || prev === null)) {
      if (c.correct) {
        sfx.correct();
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#ffd23f', '#ff5d8f', '#2ee6c5', '#4d7cff'], zIndex: 100 });
      } else sfx.wrong();
    }
    if (c.status === 'veto') sfx.vote();
  }, [c.status, c.correct]);

  const answer = (val) => {
    const v = (val ?? text).trim();
    if (!v) return;
    sfx.pop();
    send('answer', { text: v });
  };
  const joker = (kind) => { sfx.joker(); send('joker', { kind }); };

  const pct = (left / ANSWER_SECONDS) * 100;
  const barColor = pct > 50 ? 'var(--teal)' : pct > 20 ? 'var(--yellow)' : 'var(--red)';
  const jokers = player?.jokers || {};
  const letters = ['A', 'B', 'C', 'D'];

  return (
    <div className="overlay">
      <div className="qcard">
        <div className="qhead">
          <span className="chip" style={{ background: CAT_COLORS[c.cat % 5] }}>{cat.icon} {cat.name}</span>
          <span className="value-chip">{c.value}</span>
        </div>
        <div className="row" style={{ marginBottom: 6 }}>
          <Avatar avatar={player?.avatar} size={34} />
          <b>{mine ? 'Deine Frage' : player?.name + ' ist dran'}</b>
        </div>

        {c.status === 'loading' && (
          <div className="thinking">
            <div className="dice">{c.swapped ? '🔄' : '🎲'}</div>
            <div className="display" style={{ fontSize: 22 }}>{c.swapped ? 'Neue Frage, gleich schwer …' : THINKING[thinkIdx]}</div>
          </div>
        )}

        {c.status === 'error' && (
          <div className="thinking">
            <div style={{ fontSize: 54 }}>😵</div>
            <div style={{ fontWeight: 800, textAlign: 'center' }}>Die Frage konnte nicht geladen werden.</div>
            <div className="muted" style={{ fontSize: 12, textAlign: 'center', wordBreak: 'break-word' }}>{c.error}</div>
            {(mine || isHost) && <button className="btn" onClick={() => send('retry')}>Nochmal versuchen</button>}
          </div>
        )}

        {c.q && c.status !== 'loading' && c.status !== 'error' && (
          <>
            <div className="qtext" key={c.q.question} style={{ animation: 'popIn .35s both' }}>{c.q.question}</div>

            {c.status === 'asking' && (
              <div className="timer"><div style={{ width: pct + '%', background: barColor }} /></div>
            )}

            {c.used.hint && c.status === 'asking' && <div className="hint-box">💡 {c.q.hint}</div>}

            {c.status === 'asking' && (
              <>
                {c.used.choices ? (
                  <div className="options">
                    {c.q.options.map((o, i) => (
                      <button key={o} className="opt" style={{ animationDelay: i * 0.06 + 's' }} disabled={!mine} onClick={() => answer(o)}>
                        <span className="letter">{letters[i]}</span>{o}
                      </button>
                    ))}
                  </div>
                ) : mine ? (
                  <div className="row">
                    <input
                      ref={inputRef}
                      className="input"
                      placeholder="Deine Antwort …"
                      value={text}
                      maxLength={120}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && answer()}
                    />
                    <button className="btn green" disabled={!text.trim()} onClick={() => answer()}>➜</button>
                  </div>
                ) : (
                  <div className="center muted" style={{ fontWeight: 800, padding: 10 }}>✍️ {player?.name} tippt …</div>
                )}
                {mine && (
                  <div className="jokers">
                    <button className="joker" disabled={!jokers.hint || c.used.hint} onClick={() => joker('hint')}><span className="j">💡</span>Tipp</button>
                    <button className="joker" disabled={!jokers.swap} onClick={() => joker('swap')}><span className="j">🔄</span>Frage tauschen</button>
                    <button className="joker" disabled={!jokers.choices || c.used.choices} onClick={() => joker('choices')}><span className="j">🔠</span>4 Antworten</button>
                  </div>
                )}
                <div className="center muted" style={{ marginTop: 12, fontWeight: 800 }}>{Math.ceil(left)} Sek.</div>
              </>
            )}

            {c.status === 'judging' && (
              <div className="thinking">
                <div className="dice">⚖️</div>
                <div style={{ fontWeight: 800 }}>„{c.given}“ wird geprüft …</div>
              </div>
            )}

            {(c.status === 'result' || c.status === 'veto') && (
              <div className="result">
                <div className="big-icon" key={String(c.correct)}>{c.correct ? '✅' : c.timedOut ? '⏰' : '❌'}</div>
                <div className={'delta ' + (c.delta >= 0 ? 'plus' : 'minus')} key={'d' + c.delta}>{c.delta > 0 ? '+' : ''}{c.delta}</div>
                {c.vetoResult === 'accepted' && <div className="display" style={{ color: 'var(--green)' }}>Veto angenommen! 🙌</div>}
                {c.vetoResult === 'rejected' && <div className="display" style={{ color: 'var(--red)' }}>Veto abgelehnt 🙅</div>}
                <div className="answer-box">
                  {!c.timedOut && <div className="muted">Antwort: „{c.given}“</div>}
                  {c.timedOut && <div className="muted">Zeit abgelaufen</div>}
                  <div>Richtig: <b>{c.q.answer}</b></div>
                  {c.q.explanation && <div className="muted" style={{ fontSize: 14, marginTop: 6 }}>{c.q.explanation}</div>}
                </div>

                {c.status === 'veto' && <VetoBox room={room} me={me} />}

                {c.status === 'result' && (
                  <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
                    {mine && !c.correct && !c.timedOut && !c.vetoResult && (
                      <button className="btn red" onClick={() => { sfx.vote(); send('veto'); }}>✋ Veto – war richtig!</button>
                    )}
                    {(mine || isHost) && <button className="btn" onClick={() => { sfx.click(); send('next'); }}>Weiter ➜</button>}
                    {!mine && !isHost && <div className="muted" style={{ fontWeight: 800 }}>Warte auf {player?.name} …</div>}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function VetoBox({ room, me }) {
  const { state, send } = room;
  const c = state.current;
  const voters = vetoVoters(state);
  const canVote = voters.includes(me.id);
  const my = c.vetoVotes[me.id];
  const yes = voters.filter((id) => c.vetoVotes[id] === true);
  const no = voters.filter((id) => c.vetoVotes[id] === false);
  const need = Math.floor(voters.length / 2) + 1;
  return (
    <div className="card" style={{ background: 'var(--card2)', marginBottom: 12 }}>
      <div className="display" style={{ fontSize: 22, marginBottom: 8 }}>✋ Veto! Zählt „{c.given}“ als richtig?</div>
      <div className="muted" style={{ fontWeight: 700, marginBottom: 10 }}>Mehrheit entscheidet ({need} von {voters.length} nötig)</div>
      {canVote ? (
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className={'btn green' + (my === true ? '' : ' ')} style={{ opacity: my === false ? 0.5 : 1 }} onClick={() => { sfx.vote(); send('vetoVote', { yes: true }); }}>👍 Ja ({yes.length})</button>
          <button className="btn red" style={{ opacity: my === true ? 0.5 : 1 }} onClick={() => { sfx.vote(); send('vetoVote', { yes: false }); }}>👎 Nein ({no.length})</button>
        </div>
      ) : (
        <div className="center" style={{ fontWeight: 800 }}>👍 {yes.length} · 👎 {no.length} – die anderen stimmen ab …</div>
      )}
    </div>
  );
}
