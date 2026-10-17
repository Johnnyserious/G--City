// „Das ist neu“: wird nach einem Update einmal angezeigt (wie bei Apple), ein Punkt pro Bildschirm.
// Neuen Eintrag OBEN anfügen, mit neuer id. Wer die id schon gesehen hat, bekommt ihn nicht nochmal.
export const CHANGELOG = [
  {
    id: '2026-10-17-slf',
    items: [
      { emoji: '🏙️', title: 'Stadt, Land, Fluss, Insider', text: 'Neues Spiel! Dreh dit Rad, tipp Stadt, Land, Fluss und euren besten Insider. Wer alles hat, ruft STOPP!' },
      { emoji: '⭐', title: 'Eigene Extra-Kategorie', text: 'Vor jedem Spiel kann der Host eine Kategorie dazu erfinden – Rapper, Promi, Ausrede … wat ihr wollt.' },
      { emoji: '🐻', title: 'G City berlinert jetzt', text: 'Knorke, wa? Die App schnackt ab sofort Berlinerisch. Kommste klar?' },
      { emoji: '🎧', title: 'Songs erraten', text: 'Erkennste den Song nach 0,2 Sekunden? Deutschrap, R&B, Klassiker und Bravo Hits – online oder mit einem Handy für alle.' },
    ],
  },
  {
    id: '2026-10-17-songs',
    items: [
      { emoji: '🎧', title: 'Songs erraten', text: 'Neues Spiel! Erkennst du den Song nach 0,2 Sekunden? Deutschrap, R&B, Klassiker und Bravo Hits – online oder mit einem Handy für alle.' },
      { emoji: '💡', title: 'Vorschläge beim Tippen', text: 'Bei Songs erraten musst du den Titel nicht perfekt kennen – während du tippst, kommen passende Songs zum Antippen.' },
      { emoji: '🧠', title: 'Bessere Quizfragen', text: '100 ist jetzt machbar, aber nicht geschenkt, 500 richtig knackig. Filme & Serien nur noch mit Sachen, die man wirklich kennt.' },
      { emoji: '😂', title: 'Emoji-Leiste bleibt stehen', text: 'Die Schnell-Emojis im Chat springen nicht mehr um – du kannst jetzt ordentlich draufhämmern.' },
      { emoji: '👋', title: 'Spiel verlassen geht jetzt', text: 'Mitten im Spiel raus? Kein Problem – die anderen spielen weiter und deine G-Punkte bleiben.' },
      { emoji: '😎', title: 'Anmelden mit Face ID', text: 'Im Profil unter Einstellungen einrichten – dann bist du auf jedem Handy mit einem Blick wieder drin.' },
    ],
  },
];

export const LATEST = CHANGELOG[0];
