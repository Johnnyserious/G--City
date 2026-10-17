// Ersatzliste, falls Imgflip und memegen.link nicht erreichbar sind.
// Normal kommen ~300 Vorlagen live über /api/memes (Imgflip + memegen.link).
const T = (id, name, file, width, height) => ({ id: String(id), name, url: `https://i.imgflip.com/${file}`, width, height });

export const FALLBACK_TEMPLATES = [
  T(181913649, 'Drake Hotline Bling', '30b1gx.jpg', 1200, 1200),
  T(112126428, 'Distracted Boyfriend', '1ur9b0.jpg', 1200, 800),
  T(87743020, 'Two Buttons', '1g8my4.jpg', 600, 908),
  T(129242436, 'Change My Mind', '24y43o.jpg', 482, 361),
  T(124822590, 'Left Exit 12 Off Ramp', '22bdq6.jpg', 804, 767),
  T(93895088, 'Expanding Brain', '1jwhww.jpg', 857, 1202),
  T(438680, 'Batman Slapping Robin', '9ehk.jpg', 400, 387),
  T(61579, 'One Does Not Simply', '1bij.jpg', 568, 335),
  T(97984, 'Disaster Girl', '23ls.jpg', 500, 375),
  T(27813981, 'Hide the Pain Harold', 'gk5el.jpg', 480, 601),
  T(188390779, 'Woman Yelling At Cat', '345v97.jpg', 680, 438),
  T(100777631, 'Is This A Pigeon', '1o00in.jpg', 1587, 1425),
  T(89370399, 'Roll Safe Think About It', '1h7in3.jpg', 702, 395),
  T(102156234, 'Mocking Spongebob', '1otk96.jpg', 502, 353),
  T(61544, 'Success Kid', '1bhk.jpg', 500, 500),
  T(101470, 'Ancient Aliens', '26am.jpg', 500, 437),
  T(61520, 'Futurama Fry', '1bgw.jpg', 552, 414),
  T(5496396, 'Leonardo Dicaprio Cheers', '39t1o.jpg', 600, 400),
  T(55311130, 'This Is Fine', 'wxica.jpg', 580, 282),
  T(222403160, 'Bernie I Am Once Again Asking', '3oevdk.jpg', 750, 750),
  // Weitere Klassiker von memegen.link (Bildgröße wird beim Laden ermittelt)
  ...['stonks', 'buzz', 'both', 'kermit', 'mordor', 'wonka', 'aag', 'ackbar', 'afraid', 'gru', 'pooh', 'cheems', 'doge', 'keanu', 'morpheus', 'oprah', 'philosoraptor', 'astronaut', 'chair', 'patrick', 'gb', 'ds']
    .map((id) => ({ id: 'mg-' + id, name: id, url: `https://api.memegen.link/images/${id}.png` })),
];
