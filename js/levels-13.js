// Lanternfall: the Melon Patch, a chapter of speed. Watermelons (m) make you run faster,
// and every level here is built to make the most of it: long belts, crumbling bridges, and
// a horde that runs far faster than usual. There's a watermelon at the start of each level
// and another by its lantern. Like the Sky Roads, these levels aren't in LF.LEVELS when the
// boss fights are laid in; bosses.js slots them in after the Ember Gardens. Load after
// levels-12.js and before bosses.js.
(() => {
  const LF = window.LF;
  const B = LF.build;
  const melon = (name, w, extra, draw) => ({ chapter: 'The Melon Patch', name, melon: true, since: 5, dark: .55, ...extra, map: B(w, 16, draw) });

  LF.MELON_LEVELS = [
    melon('Melon Dash', 100, { signs: [{ x: 1, y: 8.4, t: '🍉 WATERMELON: run faster till you die' }] }, ({ r, s }) => {
      r(0, 12, 12, 15); s(2, 11, 'P'); s(5, 11, 'm');
      r(16, 12, 24, 15); s(21, 11, 'B');
      r(27, 11, 33, 11, 'C');
      r(36, 12, 44, 15); s(40, 11, 'L'); s(38, 11, 'm');
      r(48, 12, 56, 15); s(52, 11, 'J');
      for (const x of [59, 61, 63]) s(x, 11, 'd');
      r(66, 12, 74, 15); s(70, 11, 'R');
      r(78, 12, 99, 15); s(82, 11, 'm'); s(88, 11, 'B'); s(96, 11, 'D');
    }),
    melon('Rind Runway', 110, { signs: [{ x: 1, y: 8.4, t: 'the belts run against you: a melon pushes through' }] }, ({ r, s }) => {
      r(0, 12, 10, 15); s(2, 11, 'P'); s(4, 11, 'm');
      r(11, 13, 30, 15); r(11, 12, 30, 12, '<'); s(20, 11, 'K');
      r(31, 12, 38, 15); s(35, 11, 'L'); s(33, 11, 'm');
      r(39, 13, 60, 15); r(39, 12, 60, 12, '<'); r(45, 12, 46, 12, '^'); r(53, 12, 54, 12, '^');
      r(61, 12, 66, 15);
      r(70, 13, 90, 15); r(70, 12, 90, 12, '<'); s(80, 7, 'W');
      r(91, 12, 109, 15); s(94, 11, 'm'); s(106, 11, 'D');
    }),
    melon('Vine Sprint', 120, { tuning: { '&': { speed: 2.2 } }, signs: [{ x: 4, y: 8.4, t: 'the horde is quick here: grab the melon and RUN →' }] }, ({ r, s }) => {
      s(0, 5, '&');
      r(0, 12, 14, 15); s(6, 11, 'P'); s(8, 11, 'm');
      r(18, 12, 28, 15);
      r(31, 10, 35, 10, 'C');
      r(38, 12, 48, 15); s(44, 11, 'L'); s(46, 11, 'm');
      s(52, 11, 'd'); s(55, 11, 'd');
      r(58, 12, 70, 15); s(64, 11, 'B');
      r(73, 10, 76, 10, '=');
      r(79, 12, 92, 15); s(84, 11, 'm'); s(90, 11, 'S');
      r(96, 12, 119, 15); s(115, 11, 'D');
    }),
    melon('Crumbling Rows', 110, { signs: [{ x: 1, y: 8.4, t: 'the bridges crumble under you: keep moving' }] }, ({ r, s }) => {
      r(0, 12, 10, 15); s(2, 11, 'P'); s(5, 11, 'm');
      r(11, 14, 40, 15, '!');
      r(11, 12, 18, 12, 'C'); r(21, 12, 28, 12, 'C'); r(31, 12, 40, 12, 'C');
      r(41, 12, 50, 15); s(46, 11, 'L'); s(43, 11, 'm'); s(49, 11, 'R');
      r(51, 14, 80, 15, '!');
      r(53, 11, 58, 11, 'C');
      for (const x of [61, 63, 65]) s(x, 10, 'd');
      r(68, 11, 78, 11, 'C');
      r(81, 12, 109, 15); s(84, 11, 'm'); s(95, 11, 'A'); s(106, 11, 'D');
    }),
    melon('The Long Patch', 150, { tuning: { '&': { speed: 2.4 } }, signs: [{ x: 3, y: 8.4, t: 'a long way to run · the belts help' }] }, ({ r, s }) => {
      s(0, 6, '&');
      r(0, 12, 12, 15); s(5, 11, 'P'); s(8, 11, 'm');
      r(13, 13, 30, 15); r(13, 12, 30, 12, '>');
      r(34, 12, 44, 15); s(40, 11, 'B');
      r(47, 10, 53, 10, 'C');
      r(56, 12, 66, 15); s(62, 11, 'L'); s(60, 11, 'm');
      for (const x of [69, 71, 73]) s(x, 11, 'd');
      r(76, 12, 90, 15); s(84, 11, 'J');
      r(91, 13, 100, 15); r(91, 12, 100, 12, '>');
      r(104, 10, 107, 10, '=');
      r(110, 12, 124, 15); s(112, 11, 'm'); s(120, 11, 'K');
      r(127, 11, 129, 11, 'C');
      r(132, 12, 149, 15); s(146, 11, 'D');
    }),
    melon('Harvest Rush', 140, { tuning: { '&': { speed: 2.5 } }, signs: [{ x: 3, y: 8.4, t: 'last of the harvest · don’t look back' }] }, ({ r, s }) => {
      s(0, 5, '&');
      r(0, 12, 12, 15); s(5, 11, 'P'); s(7, 11, 'm');
      r(16, 12, 26, 15); s(21, 11, '^');
      for (const x of [29, 32, 35]) s(x, 11, 'd');
      r(38, 12, 52, 15); s(44, 11, 'L'); s(41, 11, 'm'); s(48, 7, 'W');
      r(55, 10, 62, 10, 'C');
      r(65, 12, 78, 15); s(72, 11, 'R');
      r(79, 13, 90, 15); r(79, 12, 90, 12, '>');
      r(94, 12, 104, 15); s(96, 11, 'm'); s(100, 11, '^');
      s(107, 11, 'd'); s(110, 11, 'd');
      r(113, 12, 139, 15); s(120, 11, 'B'); s(136, 11, 'D');
    }),
  ];
})();
