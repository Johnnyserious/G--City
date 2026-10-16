// Shop-Katalog. Preise hier ändern, alles andere zieht automatisch nach.
// 100 Münzen ≈ 1 €. Echtgeld-Preise in Cent.

export const DAILY_BONUS = 10; // Gratis-Münzen pro Tag (nur eingeloggt)

// Joker & Hilfen: werden mit Münzen gekauft, landen in der "Joker-Tasche" und werden im Spiel verbraucht.
// Pro Spiel darf jeder höchstens 1 gekauften Joker einsetzen. Der Host kann sie im Raum ausschalten.
export const ITEMS = [
  { id: 'quiz_hint', game: 'quiz', icon: '💡', name: 'Tipp-Joker (Quiz)', desc: 'Gibt dir einen schon benutzten Tipp-Joker zurück.', price: 30 },
  { id: 'quiz_swap', game: 'quiz', icon: '🔄', name: 'Tausch-Joker (Quiz)', desc: 'Gibt dir einen schon benutzten Tausch-Joker zurück.', price: 30 },
  { id: 'quiz_choices', game: 'quiz', icon: '🔠', name: '4-Antworten-Joker (Quiz)', desc: 'Gibt dir den Joker mit den 4 Antwortmöglichkeiten zurück.', price: 40 },
  { id: 'emoji_letters', game: 'emoji', icon: '🔤', name: 'Buchstaben-Tipp (Emoji)', desc: 'Nur du siehst die ersten zwei Buchstaben der Lösung.', price: 20 },
  { id: 'draw_letters', game: 'draw', icon: '✏️', name: 'Buchstaben-Tipp (Zeichnen)', desc: 'Nur du siehst den ersten und letzten Buchstaben.', price: 20 },
  { id: 'est_double', game: 'estimate', icon: '🃏', name: 'Zweiter Doppelt-Joker (Schätzen)', desc: 'Noch ein Doppelt-Joker, nachdem du deinen benutzt hast.', price: 50 },
  { id: 'meme_reroll', game: 'meme', icon: '🎲', name: 'Nochmal würfeln (Meme)', desc: 'Ein weiteres neues Bild, wenn du schon gewürfelt hast.', price: 20 },
  { id: 'bluff_5050', game: 'bluff', icon: '✂️', name: '50:50 (Lügen-Quiz)', desc: 'Die Hälfte der Lügen verschwindet – nur bei dir.', price: 60 },
];
export const itemById = (id) => ITEMS.find((i) => i.id === id);

// Münzen-Pakete (Echtgeld)
export const COIN_PACKS = [
  { id: 'coins_300', coins: 300, cents: 299, label: '300 Münzen' },
  { id: 'coins_550', coins: 550, cents: 499, label: '550 Münzen', tag: '+10 % gratis' },
  { id: 'coins_1200', coins: 1200, cents: 999, label: '1.200 Münzen', tag: '+20 % gratis' },
  { id: 'coins_2600', coins: 2600, cents: 1999, label: '2.600 Münzen', tag: 'Bester Preis' },
];

// Bundles (Echtgeld, direkt kaufbar): Joker + Bonus-Münzen
export const BUNDLES = [
  {
    id: 'bundle_starter', cents: 299, name: 'Starter-Bundle', icon: '🎒',
    items: { quiz_hint: 2, quiz_swap: 2, emoji_letters: 3, draw_letters: 3, meme_reroll: 2 }, coins: 50,
  },
  {
    id: 'bundle_party', cents: 499, name: 'Partyabend-Bundle', icon: '🎉',
    items: { quiz_hint: 3, quiz_swap: 3, quiz_choices: 3, emoji_letters: 4, draw_letters: 4, est_double: 2, meme_reroll: 3, bluff_5050: 2 }, coins: 100,
  },
  {
    id: 'bundle_mega', cents: 999, name: 'Mega-Bundle', icon: '👑',
    items: { quiz_hint: 6, quiz_swap: 6, quiz_choices: 6, emoji_letters: 8, draw_letters: 8, est_double: 5, meme_reroll: 6, bluff_5050: 5 }, coins: 400,
  },
];

export const productById = (id) => COIN_PACKS.find((p) => p.id === id) || BUNDLES.find((b) => b.id === id);
export const euro = (cents) => (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
export const bundleWorth = (b) => Object.entries(b.items).reduce((s, [id, n]) => s + (itemById(id)?.price || 0) * n, 0) + (b.coins || 0);
