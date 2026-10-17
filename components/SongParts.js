'use client';
// Gemeinsame Teile für „Songs erraten“ (online + ein Handy)
import { useEffect, useRef, useState } from 'react';
import { sfx, haptic } from '@/lib/sound';
import { SONG_CATS, SONGS } from '@/lib/songList';
import { STAGES, POINTS, ROUND_OPTIONS, SECOND_OPTIONS, ALL, normTitle } from '@/lib/songs';
import { playSong, stopSong, loadSong } from '@/lib/songAudio';

export const fmtSec = (x) => String(x).replace('.', ',') + ' s';

export function CatPicker({ cats, onChange, disabled }) {
  const all = !cats?.length || cats.includes(ALL);
  const toggle = (key) => {
    sfx.click();
    if (key === ALL) return onChange([ALL]);
    const cur = all ? [] : cats;
    const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key];
    onChange(next.length ? next : [ALL]);
  };
  return (
    <div className="seg seg-wrap">
      <button className={'seg-btn' + (all ? ' on' : '')} disabled={disabled} onClick={() => toggle(ALL)}>🎲 Alles gemischt</button>
      {SONG_CATS.map((c) => (
        <button key={c.key} className={'seg-btn' + (!all && cats.includes(c.key) ? ' on' : '')} disabled={disabled} onClick={() => toggle(c.key)}>{c.icon} {c.name}</button>
      ))}
    </div>
  );
}

export function SongSettings({ settings, onChange, disabled, online = true }) {
  const Seg = ({ label, opts, k, fmt }) => (
    <div>
      <div className="muted" style={{ fontWeight: 800, marginBottom: 6 }}>{label}</div>
      <div className="seg">
        {opts.map((o) => (
          <button key={String(o)} className={'seg-btn' + (settings[k] === o ? ' on' : '')} disabled={disabled} onClick={() => { sfx.click(); onChange({ [k]: o }); }}>{fmt(o)}</button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="stack">
      {online && (
        <div>
          <div className="muted" style={{ fontWeight: 800, marginBottom: 6 }}>Wer hört was?</div>
          <div className="seg">
            <button className={'seg-btn' + (settings.mode === 'own' ? ' on' : '')} disabled={disabled} onClick={() => { sfx.click(); onChange({ mode: 'own' }); }}>🎧 Jeder eigener Song</button>
            <button className={'seg-btn' + (settings.mode === 'same' ? ' on' : '')} disabled={disabled} onClick={() => { sfx.click(); onChange({ mode: 'same' }); }}>👥 Alle denselben</button>
          </div>
        </div>
      )}
      <Seg label={online ? 'Runden' : 'Songs'} opts={online ? ROUND_OPTIONS : [10, 15, 20, 30]} k={online ? 'rounds' : 'count'} fmt={(n) => n + (online ? ' Runden' : ' Songs')} />
      {online && <Seg label="Zeit pro Runde" opts={SECOND_OPTIONS} k="seconds" fmt={(n) => n + ' s'} />}
      <div>
        <div className="muted" style={{ fontWeight: 800, marginBottom: 6 }}>Musik (mehrere möglich)</div>
        <CatPicker cats={settings.cats} disabled={disabled} onChange={(cats) => onChange({ cats })} />
      </div>
    </div>
  );
}

// Fortschritt wie bei Heardle: 5 Etappen, die bisher freigeschalteten sind farbig
export function StageBar({ stage, playing, solvedAt = -1 }) {
  return (
    <div className="stage-bar">
      {STAGES.map((sec, i) => {
        const cls = i === solvedAt ? ' solved' : i < stage ? ' used' : i === stage ? ' now' : '';
        return <div key={i} className={'stage-seg' + cls + (playing && i <= stage ? ' playing' : '')}><span>{fmtSec(sec)}</span></div>;
      })}
    </div>
  );
}

export function StagePoints({ stage }) {
  return (
    <div className="row" style={{ justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
      {STAGES.map((sec, i) => (
        <span key={i} className={'stage-pill' + (i === stage ? ' on' : i < stage ? ' off' : '')}>{fmtSec(sec)} · {POINTS[i]}</span>
      ))}
    </div>
  );
}

// Großer Abspiel-Knopf. Lädt den Song vorab, damit der 0,2-s-Schnipsel sofort kommt.
export function PlayButton({ url, seconds, from = null, label, big = true, onPlay }) {
  const [state, setState] = useState('loading'); // loading | ready | playing | error
  const timer = useRef(null);
  useEffect(() => {
    let alive = true;
    setState('loading');
    loadSong(url).then(() => alive && setState('ready')).catch(() => alive && setState('error'));
    return () => { alive = false; clearTimeout(timer.current); stopSong(); };
  }, [url]);
  const play = async () => {
    if (state === 'loading') return;
    haptic('tap');
    try {
      setState('playing');
      onPlay && onPlay();
      const r = await playSong(url, { dur: seconds, from, onEnd: () => setState('ready') });
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setState('ready'), (r.length + 0.3) * 1000);
    } catch {
      setState('error');
    }
  };
  const text = state === 'loading' ? '⏳ Lädt …' : state === 'error' ? '⚠️ Nochmal versuchen' : state === 'playing' ? '🔊 Läuft …' : label || `▶ ${fmtSec(seconds)} anhören`;
  return (
    <button className={'btn full ' + (big ? 'big play-btn ' : 'small ') + (state === 'playing' ? 'playing' : 'pink')} onClick={state === 'error' ? () => { setState('loading'); loadSong(url).then(() => setState('ready')).catch(() => setState('error')); } : play}>
      {text}
    </button>
  );
}

export function SongCover({ song, size = 140 }) {
  return song?.cover ? (
    <img className="song-cover" src={song.cover} alt="" width={size} height={size} style={{ width: size, height: size }} />
  ) : (
    <div className="song-cover empty" style={{ width: size, height: size }}>🎵</div>
  );
}

export function SongRules({ online = true }) {
  return (
    <details className="card rules">
      <summary className="display" style={{ fontSize: 20 }}>So geht’s 📖</summary>
      {online ? (
        <ol>
          <li>Jeder hört auf seinem Handy einen Song – zuerst nur <b>0,2 Sekunden</b>, direkt aus der Hook.</li>
          <li>Titel eintippen. Richtig in Etappe 1 = <b>{POINTS[0]} Punkte</b>.</li>
          <li>Falsch oder „Mehr hören“ → nächste Etappe: 1 s, 3 s, 5 s, 15 s – jeweils weniger Punkte ({POINTS.join(' / ')}).</li>
          <li>Kleine Tippfehler sind okay, „feat.“ und Klammern musst du nicht schreiben.</li>
          <li>Am Ende jeder Runde wird aufgelöst, am Schluss gibt’s die Rangliste.</li>
        </ol>
      ) : (
        <ol>
          <li>Ein Handy, alle hören zu. Der Song läuft (30 s).</li>
          <li>Wer ihn zuerst erkennt, ruft laut den Titel.</li>
          <li>Tippt an, wer es war: in den ersten 5 s = 3 Punkte, bis 15 s = 2, danach 1.</li>
          <li>Am Ende gibt’s die Rangliste.</li>
        </ol>
      )}
    </details>
  );
}

export const catName = (key) => SONG_CATS.find((c) => c.key === key);

// Eingabe mit Vorschlägen aus der Song-Liste (wie bei Heardle). Kein Streaming-Dienst nötig.
const INDEX = (() => {
  const seen = new Set();
  const out = [];
  for (const s of SONGS) {
    const k = normTitle(s.artist + ' ' + s.title);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ title: s.title, artist: s.artist, t: normTitle(s.title), a: normTitle(s.artist) });
  }
  return out;
})();

export function suggest(q, max = 6) {
  const n = normTitle(q);
  if (n.length < 2) return [];
  const words = n.split(' ');
  const scored = [];
  for (const s of INDEX) {
    const hay = s.t + ' ' + s.a;
    if (!words.every((w) => hay.includes(w))) continue;
    const score = (s.t.startsWith(n) ? 0 : s.t.includes(n) ? 1 : s.a.startsWith(n) ? 2 : 3) + s.t.length / 100;
    scored.push([score, s]);
  }
  return scored.sort((x, y) => x[0] - y[0]).slice(0, max).map((x) => x[1]);
}

export function SongGuessInput({ onGuess, disabled, placeholder = 'Song-Titel …' }) {
  const [text, setText] = useState('');
  const [hi, setHi] = useState(0);
  const ref = useRef(null);
  const list = suggest(text);
  const submit = (v) => {
    const val = String(v ?? text).trim();
    if (!val || disabled) return;
    haptic('tap');
    onGuess(val);
    setText('');
    setHi(0);
    ref.current?.focus();
  };
  return (
    <div className="song-guess">
      {list.length > 0 && (
        <div className="suggest-list">
          {list.map((s, i) => (
            <button key={s.artist + s.title} className={'suggest-row' + (i === hi ? ' on' : '')} onMouseDown={(e) => e.preventDefault()} onClick={() => submit(s.title)}>
              <b>{s.title}</b><span>{s.artist}</span>
            </button>
          ))}
        </div>
      )}
      <div className="chat-input" style={{ padding: 0 }}>
        <input
          ref={ref}
          value={text}
          maxLength={60}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => { setText(e.target.value); setHi(0); }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, list.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
            else if (e.key === 'Enter') submit(list[hi] ? list[hi].title : text);
          }}
        />
        <button className="btn small teal" disabled={!text.trim() || disabled} onClick={() => submit(list[hi] ? list[hi].title : text)}>Raten</button>
      </div>
    </div>
  );
}
