// Lanternfall: boss fights. One boss arena after every 10th regular story level, in the
// chapter of the level before it. Load after all the levels-*.js files.
(() => {
  const LF = window.LF;
  const B = LF.build;

  // The five bosses come round again and again, each time in a new arena with more health
  // (bossHp) and more speed. Round 0 is the first meeting.
  const HP = [1, 1.5, 2, 2.5], SPEED = [1, 1.1, 1.2, 1.3];
  const ARENAS = {
    5: ['The Bell Pit', 'Ram’s Run', 'The Thunder Fold', 'The Last Charge'],
    6: ['The Soot Nest', 'The Ember Roost', 'Queen’s Chimney', 'The Blackened Sky'],
    7: ['Marksman’s Deck', 'The Archery Loft', 'Hollow Range', 'The Final Volley'],
    8: ['Colossus Yard', 'The Iron Quarry', 'The Anvil Floor', 'Colossus Reborn'],
    9: ['The Powder Throne', 'The Fuse Hall', 'The Blasting Court', 'The Last Keg'],
  };
  const SIGNS = {
    5: 'THE BELLWETHER · dodge the charge · stomp it while it’s dazed',
    6: 'THE SOOT QUEEN · stomp her when she lands',
    7: 'THE ASH MARKSMAN · blocks stop arrows',
    8: 'THE IRON COLOSSUS · jump its shockwaves',
    9: 'THE POWDER KING · blow up his carts beside him',
  };
  // Each arena is walled in, with planks to dodge to and lanterns as checkpoints. A boss
  // gate (g) from floor to ceiling shuts off the door until the boss is down. Later rounds
  // leave an extra crate of ammo for the extra health.
  const MAPS = {
    5: round => B(46, 16, ({ r, s, walls }) => {
      walls(); r(0, 0, 45, 0); r(1, 13, 44, 14);
      s(3, 12, 'P'); s(5, 12, 'Q'); s(7, 12, 'L');
      r(10, 10, 15, 10, '='); s(12, 9, 'q');
      r(20, 7, 25, 7, '='); s(22, 6, round ? '$' : 'q');
      r(30, 10, 35, 10, '=');
      r(38, 9, 43, 9, '='); s(40, 8, 'L');
      s(30, 12, '5'); r(42, 1, 42, 12, 'g'); s(43, 12, 'D');
    }),
    6: round => B(48, 20, ({ r, s, walls }) => {
      walls(); r(0, 0, 47, 0); r(1, 17, 46, 18);
      s(3, 16, 'P'); s(5, 16, 'Q'); s(42, 16, 'q');
      r(8, 14, 13, 14, '='); s(10, 13, 'L');
      r(34, 14, 39, 14, '='); s(36, 13, 'L');
      r(15, 11, 32, 11, '='); s(23, 10, 'Q'); if (round) s(28, 10, '$');
      s(24, 7, '6'); r(44, 1, 44, 16, 'g'); s(45, 16, 'D');
    }),
    7: round => B(50, 18, ({ r, s, walls }) => {
      walls(); r(0, 0, 49, 0); r(1, 15, 48, 16);
      s(2, 14, 'P'); s(4, 14, '$');
      r(10, 12, 14, 12); s(12, 11, 'L');
      r(35, 12, 39, 12); s(37, 11, 'L');
      r(20, 9, 29, 9, '='); s(24, 8, 'q'); if (round) s(27, 8, '$');
      r(17, 14, 17, 14); r(32, 14, 32, 14);
      s(30, 14, '7'); r(46, 1, 46, 14, 'g'); s(47, 14, 'D');
    }),
    8: round => B(50, 18, ({ r, s, walls }) => {
      walls(); r(0, 0, 49, 0); r(1, 15, 48, 16);
      s(2, 14, 'P'); s(4, 14, '$');
      r(8, 12, 13, 12, '='); s(10, 11, 'L');
      r(36, 12, 41, 12, '='); s(38, 11, 'L');
      r(15, 9, 34, 9, '='); s(24, 8, 'Q'); if (round) s(30, 8, '$');
      s(30, 14, '8'); r(46, 1, 46, 14, 'g'); s(47, 14, 'D');
    }),
    9: round => B(52, 18, ({ r, s, walls }) => {
      walls(); r(0, 0, 51, 0); r(1, 15, 50, 16);
      s(2, 14, 'P'); s(4, 14, '$');
      r(8, 12, 13, 12, '='); s(10, 11, 'L');
      r(15, 9, 36, 9, '='); s(25, 8, 'Q'); if (round) s(32, 8, '$');
      r(38, 12, 43, 12, '='); s(40, 11, 'L');
      s(36, 14, '9'); r(48, 1, 48, 14, 'g'); s(49, 14, 'D');
    }),
  };
  const DARK = { 5: .6, 6: .7, 7: .66, 8: .7, 9: .72 };
  const SIGN_Y = { 5: 11.4, 6: 15.4, 7: 13.4, 8: 13.4, 9: 13.4 };

  const arena = k => {
    const type = 5 + k % 5, round = Math.min(HP.length - 1, Math.floor(k / 5));
    return {
      name: ARENAS[type][round], dark: DARK[type], signs: [{ x: 2, y: SIGN_Y[type], t: SIGNS[type] }],
      map: MAPS[type](round), bossHp: HP[round],
      ...(SPEED[round] > 1 ? { tuning: { [type]: { speed: SPEED[round] } } } : {}),
    };
  };

  // Insert from the back so the earlier positions don't shift.
  const L = LF.LEVELS;
  for (let k = Math.floor(L.length / 10) - 1; k >= 0; k--) {
    const at = (k + 1) * 10;
    L.splice(at, 0, { ...arena(k), chapter: L[at - 1].chapter, boss: true });
  }
})();
