// Berliner Schnauze für die ganze App. Sprüche hier pflegen – einfach Zeilen ergänzen.
export const POPS = [
  'Weeste dit?', 'Kommste klar?', 'Is dit geil oder is dit geil?', 'Na, wat is?', 'Allet jut?', 'Jetzt aba!',
  'Wa?', 'Na, kiekste?', 'Dit wird knorke!', 'Keene Panik!', 'Hau rin!', 'Nu mach ma!', 'Det packste!',
  'Ick gloob et ja nich!', 'Mach hinne!', 'Nich lang schnacken!', 'Jib Jas!', 'Dit kannste!',
];
export const WIN = [
  'Knorke, haste jut jemacht!', 'Dufte!', 'Is dit geil oder is dit geil?', 'Haste toll jemacht!', 'Ick bin begeistert!',
  'Allet richtig jemacht, Atze!', 'Wie jeil is dit denn!',
];
export const LOSE = [
  'Haste Lack jesoffen?', 'Na, dit war wohl nüscht.', 'Kiek ma, dit war nix.', 'Mach dir nüscht draus.',
  'Et jibt keen schlechtet Wetter, nur schlechte Kleidung.', 'Dit wird schon wieda!',
];
export const WRONG = ['Nee, dit isset nich!', 'Haste Lack jesoffen?', 'Nüscht!', 'Knapp vorbei is ooch daneben.', 'Nee, Atze.'];
export const CLOSE = ['Janz nah dran!', 'Fast, wa?', 'Warm, janz warm!'];

export const pickB = (list) => list[Math.floor(Math.random() * list.length)];
