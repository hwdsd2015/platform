// Lanternfall: boss fights. One boss arena after every 10th regular story level, in the
// chapter of the level before it. Load after all the levels-*.js files.
(() => {
  const LF = window.LF;
  const B = LF.build;

  // Each arena is walled in. Planks give you somewhere to dodge to; lanterns are checkpoints.
  const BOSSES = [
    {
      name: 'The Bell Pit', dark: .6,
      signs: [{ x: 2, y: 11.4, t: 'THE BELLWETHER · dodge the charge · stomp it while it’s dazed' }],
      map: B(46, 16, ({ r, s, walls }) => {
        walls(); r(0, 0, 45, 0); r(1, 13, 44, 14);
        s(3, 12, 'P'); s(5, 12, 'Q'); s(7, 12, 'L');
        r(10, 10, 15, 10, '='); s(12, 9, 'q');
        r(20, 7, 25, 7, '='); s(22, 6, 'q');
        r(30, 10, 35, 10, '=');
        r(38, 9, 43, 9, '='); s(41, 8, 'L');
        s(30, 12, '5'); s(43, 12, 'D');
      }),
    },
    {
      name: 'The Soot Nest', dark: .7,
      signs: [{ x: 2, y: 15.4, t: 'THE SOOT QUEEN · stomp her when she lands' }],
      map: B(48, 20, ({ r, s, walls }) => {
        walls(); r(0, 0, 47, 0); r(1, 17, 46, 18);
        s(3, 16, 'P'); s(5, 16, 'Q'); s(44, 16, 'q');
        r(8, 14, 13, 14, '='); s(10, 13, 'L');
        r(34, 14, 39, 14, '='); s(36, 13, 'L');
        r(15, 11, 32, 11, '='); s(23, 10, 'Q');
        s(24, 7, '6'); s(45, 16, 'D');
      }),
    },
    {
      name: 'Marksman’s Deck', dark: .66,
      signs: [{ x: 2, y: 13.4, t: 'THE ASH MARKSMAN · blocks stop arrows' }],
      map: B(50, 18, ({ r, s, walls }) => {
        walls(); r(0, 0, 49, 0); r(1, 15, 48, 16);
        s(2, 14, 'P'); s(4, 14, '$');
        r(10, 12, 14, 12); s(12, 11, 'L');
        r(35, 12, 39, 12); s(37, 11, 'L');
        r(20, 9, 29, 9, '='); s(24, 8, 'q');
        r(17, 14, 17, 14); r(32, 14, 32, 14);
        s(30, 14, '7'); s(47, 14, 'D');
      }),
    },
    {
      name: 'Colossus Yard', dark: .7,
      signs: [{ x: 2, y: 13.4, t: 'THE IRON COLOSSUS · jump its shockwaves' }],
      map: B(50, 18, ({ r, s, walls }) => {
        walls(); r(0, 0, 49, 0); r(1, 15, 48, 16);
        s(2, 14, 'P'); s(4, 14, '$');
        r(8, 12, 13, 12, '='); s(10, 11, 'L');
        r(36, 12, 41, 12, '='); s(38, 11, 'L');
        r(15, 9, 34, 9, '='); s(24, 8, 'Q');
        s(30, 14, '8'); s(47, 14, 'D');
      }),
    },
    {
      name: 'The Powder Throne', dark: .72,
      signs: [{ x: 2, y: 13.4, t: 'THE POWDER KING · blow up his carts beside him' }],
      map: B(52, 18, ({ r, s, walls }) => {
        walls(); r(0, 0, 51, 0); r(1, 15, 50, 16);
        s(2, 14, 'P'); s(4, 14, '$');
        r(8, 12, 13, 12, '='); s(10, 11, 'L');
        r(15, 9, 36, 9, '='); s(25, 8, 'Q');
        r(38, 12, 43, 12, '='); s(40, 11, 'L');
        s(36, 14, '9'); s(49, 14, 'D');
      }),
    },
  ];

  // Insert from the back so the earlier positions don't shift.
  const L = LF.LEVELS;
  for (let k = BOSSES.length - 1; k >= 0; k--) {
    const at = (k + 1) * 10;
    if (at > L.length) continue;
    L.splice(at, 0, { ...BOSSES[k], chapter: L[at - 1].chapter, boss: true });
  }
})();
