// Spielideen für die Abstimmung in der Spielezentrale.
// key bleibt fest (daran hängen die Stimmen), Text darf man jederzeit ändern.
// planned: true = steht schon auf dem Fahrplan, die Stimmen entscheiden die Reihenfolge.
export const BUILTIN_IDEAS = [
  { key: 'charade', emoji: '🎭', title: 'Charade / Pantomime', planned: true, text: 'Einer bekommt einen Begriff aufs Handy und stellt ihn ohne Worte dar, die anderen raten gegen die Uhr.' },
  { key: 'werbinich', emoji: '🤔', title: 'Wer bin ich?', planned: true, text: 'Du bekommst eine Person, die alle sehen außer dir. Mit Ja/Nein-Fragen findest du raus, wer du bist.' },
  { key: 'zeichnen', emoji: '🎨', title: 'Zeichenspiel', done: true, text: 'Einer malt ein Wort live aufs Handy, alle anderen sehen mit. Wer zuerst richtig tippt, bekommt Punkte.' },
  { key: 'bluff', emoji: '🤥', title: 'Lügen-Quiz', text: 'Echte, kaum bekannte Frage. Jeder erfindet eine falsche Antwort, dann wird abgestimmt, was stimmt. Punkte fürs Richtigliegen und fürs Reinlegen.' },
  { key: 'wereher', emoji: '👉', title: 'Wer würde eher …?', text: '„Wer würde eher sein Handy im Urlaub verlieren?“ Alle tippen geheim auf jemanden aus der Gruppe, dann die Auflösung.' },
  { key: 'schaetzen', emoji: '📏', title: 'Schätz-Duell', text: 'Wie viele Döner werden pro Tag in Deutschland verkauft? Jeder schätzt eine Zahl, wer am nächsten dran ist, gewinnt.' },
  { key: 'emoji', emoji: '🦁', title: 'Emoji-Rätsel', text: 'Filme, Songs, Marken oder Rapper als Emojis. Wer zuerst richtig tippt, holt die Punkte.' },
  { key: 'wellenlaenge', emoji: '📡', title: 'Auf einer Wellenlänge', text: 'Skala wie „unterbewertet ↔ überbewertet“. Einer gibt einen Hinweis, das Team schiebt den Regler an die richtige Stelle.' },
  { key: 'mehrheit', emoji: '🙋', title: 'Mehrheit gewinnt', text: '„Bestes Fast Food?“ Punkte bekommt, wer dasselbe sagt wie die meisten. Wie gut kennst du die Gruppe?' },
  { key: 'stadtland', emoji: '🌍', title: 'Stadt-Land-Fluss', text: 'Zufälliger Buchstabe, eigene Kategorien. Bei Streit stimmt die Gruppe über die Antwort ab.' },
  { key: 'tabu', emoji: '🚫', title: 'Tabu', text: 'Begriff erklären, ohne die verbotenen Wörter zu sagen. Team gegen Team mit Timer.' },
  { key: 'werwolf', emoji: '🐺', title: 'Werwolf / Mafia', text: 'Die App ist der Erzähler und verteilt geheime Rollen. Nachts wird gemordet, tagsüber abgestimmt.' },
];

export const LIMITS = { title: 50, text: 200, ideasPerPerson: 10 };
