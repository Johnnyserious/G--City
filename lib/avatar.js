import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';

// Baukasten-Teile. Jeder Eintrag: Schlüssel, Label, Werte (null = "ohne")
export const PARTS = [
  { key: 'skinColor', label: 'Haut', values: ['ffdbb4', 'edb98a', 'd08b5b', 'ae5d29', '614335', 'fd9841', 'f8d25c'], color: true },
  { key: 'top', label: 'Frisur', values: ['shortFlat', 'shortWaved', 'shortCurly', 'shortRound', 'theCaesar', 'theCaesarAndSidePart', 'sides', 'shavedSides', 'frizzle', 'shaggy', 'shaggyMullet', 'fro', 'froBand', 'dreads', 'dreads01', 'dreads02', 'curly', 'bun', 'bob', 'straight01', 'straight02', 'straightAndStrand', 'longButNotTooLong', 'bigHair', 'curvy', 'miaWallace', 'frida', 'hat', 'winterHat1', 'winterHat02', 'winterHat03', 'winterHat04', 'turban', 'hijab', null] },
  { key: 'hairColor', label: 'Haarfarbe', values: ['2c1b18', '4a312c', '724133', 'a55728', 'b58143', 'd6b370', 'ecdcbf', 'e8e1e1', 'c93305', 'f59797'], color: true },
  { key: 'eyes', label: 'Augen', values: ['default', 'happy', 'wink', 'winkWacky', 'squint', 'side', 'surprised', 'hearts', 'eyeRoll', 'closed', 'cry', 'xDizzy'] },
  { key: 'eyebrows', label: 'Brauen', values: ['defaultNatural', 'raisedExcitedNatural', 'angryNatural', 'flatNatural', 'frownNatural', 'upDownNatural', 'sadConcernedNatural', 'unibrowNatural'] },
  { key: 'mouth', label: 'Mund', values: ['smile', 'default', 'twinkle', 'tongue', 'eating', 'serious', 'disbelief', 'screamOpen', 'grimace', 'concerned', 'sad', 'vomit'] },
  { key: 'facialHair', label: 'Bart', values: [null, 'beardLight', 'beardMedium', 'beardMajestic', 'moustacheFancy', 'moustacheMagnum'] },
  { key: 'accessories', label: 'Brille', values: [null, 'round', 'prescription01', 'prescription02', 'wayfarers', 'sunglasses', 'kurt', 'eyepatch'] },
  { key: 'clothing', label: 'Outfit', values: ['hoodie', 'graphicShirt', 'shirtCrewNeck', 'shirtVNeck', 'shirtScoopNeck', 'collarAndSweater', 'blazerAndShirt', 'blazerAndSweater', 'overall'] },
  { key: 'clothesColor', label: 'Outfit-Farbe', values: ['ff5c5c', 'ff488e', '65c9ff', '5199e4', '25557c', 'a7ffc4', 'ffffb1', 'ffafb9', '262e33', '929598', 'e6e6e6', 'ffffff'], color: true },
  { key: 'bg', label: 'Hintergrund', values: ['ffd23f', 'ff5d8f', '2ee6c5', '4d7cff', 'ff8a3d', 'b388ff', '7ae582', 'ffffff'], color: true },
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function randomAvatar() {
  const a = {};
  for (const p of PARTS) a[p.key] = pick(p.values);
  return a;
}

export function avatarUri(a) {
  if (!a) return '';
  const o = {
    style: ['circle'],
    backgroundColor: [a.bg || 'ffd23f'],
    skinColor: [a.skinColor || 'edb98a'],
    hairColor: [a.hairColor || '2c1b18'],
    facialHairColor: [a.hairColor || '2c1b18'],
    eyes: [a.eyes || 'default'],
    eyebrows: [a.eyebrows || 'defaultNatural'],
    mouth: [a.mouth || 'smile'],
    clothing: [a.clothing || 'hoodie'],
    clothesColor: [a.clothesColor || '65c9ff'],
    hatColor: [a.clothesColor || '65c9ff'],
    clothingGraphic: ['pizza'],
  };
  if (a.top) { o.top = [a.top]; o.topProbability = 100; } else o.topProbability = 0;
  if (a.facialHair) { o.facialHair = [a.facialHair]; o.facialHairProbability = 100; } else o.facialHairProbability = 0;
  if (a.accessories) { o.accessories = [a.accessories]; o.accessoriesProbability = 100; } else o.accessoriesProbability = 0;
  try {
    return createAvatar(avataaars, o).toDataUri();
  } catch {
    return '';
  }
}
