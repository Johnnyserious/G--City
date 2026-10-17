'use client';
import { useEffect, useRef, useState } from 'react';
import { POPS, pickB } from '@/lib/berlin';

// Kleiner Spruch oben, ganz kurz – blockiert nichts (keine Klicks, keine Vibration).
// trigger: ändert sich bei jeder neuen Frage/Runde. Nur manchmal, damit es witzig bleibt.
export default function BerlinPop({ trigger, chance = 0.35 }) {
  const [text, setText] = useState('');
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!trigger || Math.random() > chance) return;
    setText(pickB(POPS));
    const t = setTimeout(() => setText(''), 1900);
    return () => clearTimeout(t);
  }, [trigger, chance]);
  if (!text) return null;
  return <div className="berlin-pop" aria-hidden="true">{text}</div>;
}
