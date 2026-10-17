'use client';
// Eigene Dialoge statt der grauen Browser-Fenster („g-city.vercel.app says …“).
// ask({ title, text, ok, cancel, danger }) → Promise<boolean>
// choose({ title, text, options: [{ label, value, sub, cls }] }) → Promise<value | null>
// Angezeigt werden sie von <DialogHost /> (in components/App.js eingebunden).
let listener = null;
export const onDialog = (fn) => { listener = fn; return () => { if (listener === fn) listener = null; }; };

export function choose(opts) {
  return new Promise((resolve) => {
    if (!listener) { resolve(null); return; }
    listener({ ...opts, resolve });
  });
}
export function ask({ title, text, ok = 'OK', cancel = 'Abbrechen', danger = false }) {
  return choose({ title, text, options: [{ label: ok, value: true, cls: danger ? 'red' : '' }, { label: cancel, value: false, cls: 'ghost' }] }).then((v) => v === true);
}
