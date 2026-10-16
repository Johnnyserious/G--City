'use client';
import { useState } from 'react';
import Avatar from './Avatar';
import { PARTS, randomAvatar } from '@/lib/avatar';
import { sfx } from '@/lib/sound';

const LABELS = {
  null: 'ohne', shortFlat: 'Kurz glatt', shortWaved: 'Kurz wellig', shortCurly: 'Kurz lockig', shortRound: 'Kurz rund', theCaesar: 'Caesar',
  theCaesarAndSidePart: 'Seitenscheitel', sides: 'Glatze mit Seiten', shavedSides: 'Undercut', frizzle: 'Frizz', shaggy: 'Zottelig', shaggyMullet: 'Vokuhila',
  fro: 'Afro', froBand: 'Afro + Band', dreads: 'Dreads', dreads01: 'Dreads kurz', dreads02: 'Dreads lang', curly: 'Lockig', bun: 'Dutt', bob: 'Bob',
  straight01: 'Lang glatt', straight02: 'Lang glatt 2', straightAndStrand: 'Lang + Strähne', longButNotTooLong: 'Mittellang', bigHair: 'Mähne', curvy: 'Wellig lang',
  miaWallace: 'Pony', frida: 'Frida', hat: 'Hut', winterHat1: 'Mütze', winterHat02: 'Bommelmütze', winterHat03: 'Strickmütze', winterHat04: 'Wintermütze',
  turban: 'Turban', hijab: 'Hijab',
  default: 'Normal', happy: 'Fröhlich', wink: 'Zwinkern', winkWacky: 'Verrückt', squint: 'Skeptisch', side: 'Seitenblick', surprised: 'Überrascht',
  hearts: 'Verliebt', eyeRoll: 'Augenrollen', closed: 'Zu', cry: 'Weinend', xDizzy: 'K.o.',
  defaultNatural: 'Normal', raisedExcitedNatural: 'Hochgezogen', angryNatural: 'Wütend', flatNatural: 'Gerade', frownNatural: 'Grimmig',
  upDownNatural: 'Fragend', sadConcernedNatural: 'Besorgt', unibrowNatural: 'Monobraue',
  smile: 'Lächeln', twinkle: 'Grinsen', tongue: 'Zunge', eating: 'Mampfen', serious: 'Ernst', disbelief: 'Fassungslos', screamOpen: 'Schrei',
  grimace: 'Grimasse', concerned: 'Besorgt', sad: 'Traurig', vomit: 'Übel',
  beardLight: 'Dreitagebart', beardMedium: 'Bart', beardMajestic: 'Vollbart', moustacheFancy: 'Schnurrbart', moustacheMagnum: 'Magnum',
  round: 'Rund', prescription01: 'Lesebrille', prescription02: 'Nerd', wayfarers: 'Wayfarer', sunglasses: 'Sonnenbrille', kurt: 'Kurt', eyepatch: 'Augenklappe',
  hoodie: 'Hoodie', graphicShirt: 'Print-Shirt', shirtCrewNeck: 'T-Shirt', shirtVNeck: 'V-Ausschnitt', shirtScoopNeck: 'U-Ausschnitt',
  collarAndSweater: 'Pulli + Kragen', blazerAndShirt: 'Sakko', blazerAndSweater: 'Sakko + Pulli', overall: 'Latzhose',
};

export default function ProfileEditor({ initial, onSave, onCancel, joining }) {
  const [name, setName] = useState(initial?.name || '');
  const [avatar, setAvatar] = useState(initial?.avatar || randomAvatar());
  const [shake, setShake] = useState(false);

  const cycle = (part, dir) => {
    const i = part.values.indexOf(avatar[part.key] ?? null);
    const n = (i + dir + part.values.length) % part.values.length;
    setAvatar({ ...avatar, [part.key]: part.values[n] });
    sfx.click();
  };

  const save = () => {
    const n = name.trim();
    if (!n) {
      setShake(true);
      setTimeout(() => setShake(false), 450);
      return;
    }
    sfx.join();
    const id = initial?.id || (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
    onSave({ id, name: n.slice(0, 16), avatar });
  };

  return (
    <div className="wrap">
      <div className="topbar">
        <div className="logo">Quiz<span>abend</span></div>
        {onCancel && <button className="icon-btn" onClick={onCancel} aria-label="Schließen">✕</button>}
      </div>
      <div className="card">
        <h2 style={{ fontSize: 30, marginBottom: 4 }}>{initial ? 'Dein Look' : joining ? 'Bevor du reinkommst …' : 'Wer bist du heute?'}</h2>
        <p className="muted" style={{ marginTop: 0 }}>Name und Figur kannst du jederzeit spontan ändern.</p>
        <div className="builder">
          <div className="preview">
            <Avatar avatar={avatar} size={200} />
            <button className="btn pink small" onClick={() => { setAvatar(randomAvatar()); sfx.pop(); }}>🎲 Zufall</button>
          </div>
          <div className="stack">
            <input
              className={'input' + (shake ? ' shake' : '')}
              placeholder="Spielername"
              value={name}
              maxLength={16}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              autoFocus={!initial}
            />
            {PARTS.map((part) => (
              <div key={part.key} className="part-row">
                <div className="label">{part.label}</div>
                {part.color ? (
                  <div className="swatches" style={{ gridColumn: '2 / 5' }}>
                    {part.values.map((c) => (
                      <button
                        key={c}
                        className={'swatch' + (avatar[part.key] === c ? ' on' : '')}
                        style={{ background: '#' + c }}
                        onClick={() => { setAvatar({ ...avatar, [part.key]: c }); sfx.click(); }}
                        aria-label={part.label + ' ' + c}
                      />
                    ))}
                  </div>
                ) : (
                  <>
                    <button className="icon-btn" onClick={() => cycle(part, -1)} aria-label="zurück">◀</button>
                    <div className="part-val">{LABELS[avatar[part.key] ?? 'null'] || avatar[part.key]}</div>
                    <button className="icon-btn" onClick={() => cycle(part, 1)} aria-label="weiter">▶</button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
        <button className="btn big full" style={{ marginTop: 22 }} onClick={save}>
          {initial ? 'Speichern ✓' : "Los geht's 🚀"}
        </button>
      </div>
    </div>
  );
}
