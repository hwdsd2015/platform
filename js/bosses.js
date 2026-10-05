// Lanternfall: boss fights. One boss arena after every 10th regular story level, in the
// chapter of the level before it. Load after all the levels-*.js files.
(() => {
  const LF = window.LF;
  const B = LF.build;

  // The five bosses come round four times. Every fight has its own twist (bossMode, read by
  // the boss code in engine.js) and its own crowd, and across them every kind of enemy turns
  // up, both hordes included. Each round the boss also has more health (bossHp) and speed.
  // Every arena has a boss gate (g) from floor to ceiling in front of the door, which falls
  // with the boss. There are no lanterns: the door opens when the boss is down. Fruit
  // (apple shield, orange boost, banana double jump) helps instead, and grows back.
  const HP = [1, 1.5, 2, 2.5], SPEED = [1, 1.1, 1.2, 1.3];

  // Base arenas for each boss, reused with different dressing.
  const bellPit = extra => B(46, 16, ({ r, s, walls }) => {
    walls(); r(0, 0, 45, 0); r(1, 13, 44, 14);
    s(3, 12, 'P'); s(5, 12, 'Q'); s(7, 12, 'a');
    r(10, 10, 15, 10, '='); s(12, 9, 'q');
    r(20, 7, 25, 7, '='); s(22, 6, '$');
    r(30, 10, 35, 10, '=');
    r(38, 9, 43, 9, '='); s(40, 8, 'o');
    s(30, 12, '5'); r(42, 1, 42, 12, 'g'); s(43, 12, 'D');
    extra({ r, s });
  });
  const nest = extra => B(48, 20, ({ r, s, walls }) => {
    walls(); r(0, 0, 47, 0); r(1, 17, 46, 18);
    s(3, 16, 'P'); s(5, 16, 'Q'); s(42, 16, 'q');
    r(8, 14, 13, 14, '='); s(10, 13, 'b');
    r(34, 14, 39, 14, '='); s(36, 13, 'a');
    r(15, 11, 32, 11, '='); s(23, 10, 'Q'); s(28, 10, '$');
    s(24, 7, '6'); r(44, 1, 44, 16, 'g'); s(45, 16, 'D');
    extra({ r, s });
  });
  const deck = extra => B(50, 18, ({ r, s, walls }) => {
    walls(); r(0, 0, 49, 0); r(1, 15, 48, 16);
    s(2, 14, 'P'); s(4, 14, '$');
    r(10, 12, 14, 12); s(12, 11, 'o');
    r(35, 12, 39, 12); s(37, 11, 'b');
    r(20, 9, 29, 9, '='); s(24, 8, 'q'); s(27, 8, '$');
    r(17, 14, 17, 14); r(32, 14, 32, 14);
    s(30, 14, '7'); r(46, 1, 46, 14, 'g'); s(47, 14, 'D');
    extra({ r, s });
  });
  const yard = extra => B(50, 18, ({ r, s, walls }) => {
    walls(); r(0, 0, 49, 0); r(1, 15, 48, 16);
    s(2, 14, 'P'); s(4, 14, '$');
    r(8, 12, 13, 12, '='); s(10, 11, 'a');
    r(36, 12, 41, 12, '='); s(38, 11, 'o');
    r(15, 9, 34, 9, '='); s(24, 8, 'Q'); s(30, 8, '$');
    s(30, 14, '8'); r(46, 1, 46, 14, 'g'); s(47, 14, 'D');
    extra({ r, s });
  });
  const throne = extra => B(52, 18, ({ r, s, walls }) => {
    walls(); r(0, 0, 51, 0); r(1, 15, 50, 16);
    s(2, 14, 'P'); s(7, 14, '$');
    r(8, 12, 13, 12, '='); s(10, 11, 'b');
    r(15, 9, 36, 9, '='); s(25, 8, 'Q'); s(32, 8, '$');
    r(38, 12, 43, 12, '='); s(40, 11, 'a');
    s(36, 14, '9'); r(48, 1, 48, 14, 'g'); s(49, 14, 'D');
    extra({ r, s });
  });
  const none = () => {};

  const FIGHTS = [
    // ---- Round 1 ----
    { name: 'The Bell Pit', mode: 'beetles', dark: .6, sign: 'THE BELLWETHER · its slams shake beetles loose · stomp it while it’s dazed',
      map: () => bellPit(none) },
    { name: 'The Soot Nest', mode: 'bats', dark: .7, sign: 'THE SOOT QUEEN · she calls bats · stomp her when she lands',
      map: () => nest(none) },
    { name: 'Marksman’s Deck', mode: 'archers', dark: .66, sign: 'THE ASH MARKSMAN · he brought archers · blocks stop arrows',
      map: () => deck(({ s }) => { s(10, 11, 'A'); s(39, 11, 'A'); }) },
    { name: 'Colossus Yard', mode: 'guards', dark: .7, sign: 'THE IRON COLOSSUS · golems guard it · 3 stomps break a golem',
      map: () => yard(({ s }) => { s(14, 14, 'I'); s(40, 14, 'I'); }) },
    { name: 'The Powder Throne', mode: 'throne', dark: .72, sign: 'THE POWDER KING · blow up his carts beside him',
      map: () => throne(none) },
    // ---- Round 2 ----
    { name: 'Ram’s Run', mode: 'stampede', dark: .62, hordeStop: 42, sign: 'RUN → the horde drives you to the Bellwether',
      map: () => B(92, 16, ({ r, s, walls }) => {
        walls(); r(0, 0, 91, 0); r(1, 13, 90, 14);
        s(1, 12, '&'); s(4, 12, 'P'); s(7, 12, 'q');
        r(14, 13, 15, 13, '^'); r(17, 10, 22, 10, '='); s(19, 9, 'q'); s(20, 12, 'K');
        s(30, 12, 'R'); r(34, 13, 35, 13, '^'); s(38, 12, 'Q');
        r(42, 11, 42, 12);
        s(45, 12, 'o'); s(48, 12, '$');
        r(52, 10, 57, 10, '='); r(61, 7, 66, 7, '='); s(63, 6, '$'); r(72, 10, 77, 10, '='); s(75, 9, 'b');
        s(68, 12, '5'); r(89, 1, 89, 12, 'g'); s(90, 12, 'D');
      }) },
    { name: 'The Ember Roost', mode: 'rising', dark: .72, hordeStop: 19, sign: 'CLIMB ↑ the dark rises · the Soot Queen waits at the top',
      map: () => B(28, 48, ({ r, s, walls }) => {
        walls(); r(0, 0, 27, 0); r(1, 45, 26, 46);
        s(0, 47, '%'); s(3, 44, 'P'); s(5, 44, 'q');
        const A = [4, 9], M = [11, 16], C = [18, 23];
        for (const [y, [x0, x1]] of [[42, C], [39, M], [36, A], [33, M], [30, C], [27, M], [24, A], [21, M]]) r(x0, y, x1, y);
        s(13, 40, 'X'); s(6, 37, 'X'); s(20, 31, 'X');
        s(6, 35, 'a'); s(21, 29, 'o'); s(13, 32, 'q'); s(7, 23, 'Q');
        r(1, 18, 10, 18); r(11, 18, 16, 18, '='); r(17, 18, 26, 18); s(13, 17, '$');
        r(3, 15, 8, 15, '='); s(5, 14, 'b'); r(19, 15, 24, 15, '='); s(22, 14, 'a');
        s(14, 7, '6'); r(25, 1, 25, 17, 'g'); s(26, 17, 'D');
      }) },
    { name: 'Hollow Range', mode: 'fade', dark: .85, sign: 'THE ASH MARKSMAN · he fades as he leaps · strike when he shows',
      map: () => deck(({ s }) => { s(8, 5, 'G'); s(42, 5, 'G'); s(22, 10, 'X'); s(27, 10, 'X'); }) },
    { name: 'The Iron Quarry', mode: 'quarry', dark: .7, sign: 'THE IRON COLOSSUS · its landings bring the roof down',
      map: () => yard(({ s }) => { s(12, 1, 'k'); s(38, 1, 'k'); s(20, 14, 'K'); s(34, 14, 'B'); }) },
    { name: 'The Fuse Hall', mode: 'fuse', dark: .72, sign: 'THE POWDER KING · his bombs leave fire',
      map: () => throne(({ s }) => { s(19, 12, 'f'); s(31, 12, 'f'); s(26, 4, 'Z'); s(14, 14, 'R'); }) },
    // ---- Round 3 ----
    { name: 'The Thunder Fold', mode: 'ice', dark: .62, sign: 'THE BELLWETHER · on the ice it charges twice',
      map: () => bellPit(({ r, s }) => { r(1, 13, 41, 13, 'i'); s(16, 5, 'W'); s(32, 5, 'W'); }) },
    { name: 'Queen’s Chimney', mode: 'blink', dark: .85, sign: 'THE SOOT QUEEN · the platforms blink · wraiths in the dark',
      map: () => nest(({ r, s }) => {
        r(8, 14, 13, 14, 'T'); r(34, 14, 39, 14, 'H'); r(15, 11, 23, 11, 'H'); r(24, 11, 32, 11, 'T');
        s(6, 6, 'G'); s(40, 6, 'G');
      }) },
    { name: 'The Archery Loft', mode: 'lifts', dark: .66, sign: 'THE ASH MARKSMAN · ride the lifts across his pool',
      map: () => B(56, 18, ({ r, s, walls }) => {
        walls(); r(0, 0, 55, 0); r(1, 15, 14, 16); r(41, 15, 54, 16); r(15, 15, 40, 16, '~');
        s(2, 14, 'P'); s(4, 14, '$'); s(8, 14, 'o'); s(11, 14, 'q');
        s(25, 16, 'Y'); s(33, 15, 'U');
        s(15, 12, '|'); s(16, 12, 'M'); s(40, 12, '|');
        s(17, 9, '|'); s(30, 9, 'M'); s(39, 9, '|');
        r(44, 12, 47, 12); s(45, 11, 'b'); s(51, 14, 'Q');
        s(48, 14, '7'); r(53, 1, 53, 14, 'g'); s(54, 14, 'D');
      }) },
    { name: 'The Anvil Floor', mode: 'anvil', dark: .72, sign: 'THE IRON COLOSSUS · it pounds as it walks · mind the lava',
      map: () => B(50, 18, ({ r, s, walls }) => {
        walls(); r(0, 0, 49, 0);
        r(1, 15, 14, 16); r(15, 15, 17, 16, '!'); r(18, 15, 31, 16); r(32, 15, 34, 16, '!'); r(35, 15, 48, 16);
        s(16, 15, '*'); s(33, 15, '*');
        s(2, 14, 'P'); s(4, 14, '$');
        r(8, 12, 13, 12, '='); s(10, 11, 'a'); s(12, 11, 'S');
        r(36, 12, 41, 12, '='); s(38, 11, 'o'); s(40, 11, 'S');
        r(15, 9, 34, 9, '='); s(24, 8, 'Q'); s(30, 8, '$');
        s(25, 14, '8'); r(46, 1, 46, 14, 'g'); s(47, 14, 'D');
      }) },
    { name: 'The Blasting Court', mode: 'cluster', dark: .72, sign: 'THE POWDER KING · his bombs split in three · the floor moves',
      map: () => throne(({ r, s }) => { r(6, 15, 30, 15, '>'); s(20, 5, 'W'); s(12, 11, 'A'); s(42, 11, 'A'); }) },
    // ---- Round 4 ----
    { name: 'The Last Charge', mode: 'fire', dark: .64, sign: 'THE BELLWETHER · its charge leaves fire',
      map: () => bellPit(({ s }) => { s(24, 6, 'S'); s(12, 6, 'Z'); s(34, 7, 'Z'); }) },
    { name: 'The Blackened Sky', mode: 'storm', dark: .75, sign: 'THE SOOT QUEEN · embers fall in threes · the bridges crumble',
      map: () => B(50, 20, ({ r, s, walls }) => {
        walls(); r(0, 0, 49, 0);
        r(1, 17, 12, 18); r(37, 17, 48, 18); r(13, 17, 36, 18, '!'); s(19, 17, '*'); s(30, 17, '*');
        r(14, 14, 18, 14, 'C'); r(22, 12, 27, 12, 'C'); r(31, 14, 35, 14, 'C');
        s(3, 16, 'P'); s(5, 16, 'Q'); s(10, 16, '$'); s(6, 16, 'b'); s(24, 11, 'a'); s(40, 16, 'o'); s(44, 16, 'q');
        s(8, 9, 'W'); s(42, 9, 'W');
        s(25, 7, '6'); r(46, 1, 46, 16, 'g'); s(47, 16, 'D');
      }) },
    { name: 'The Final Volley', mode: 'rain', dark: .68, sign: 'THE ASH MARKSMAN · arrows rain down · springs lift you high',
      map: () => B(50, 18, ({ r, s, walls }) => {
        walls(); r(0, 0, 49, 0); r(1, 15, 17, 16); r(32, 15, 48, 16); r(18, 15, 31, 16, '~');
        s(24, 16, 'N'); s(8, 14, 'J'); s(40, 14, 'J');
        s(6, 15, 'O'); s(43, 15, 'O');
        r(3, 8, 9, 8, '='); s(5, 7, 'b'); r(40, 8, 46, 8, '='); s(44, 7, 'a');
        s(2, 14, 'P'); s(3, 14, '$'); s(12, 14, 'Q'); s(33, 14, 'q');
        s(36, 14, '7'); r(47, 1, 47, 14, 'g'); s(48, 14, 'D');
      }) },
    { name: 'Colossus Reborn', mode: 'armor', dark: .72, sign: 'THE IRON COLOSSUS · at half health it hides behind golems · TNT helps',
      map: () => yard(({ s }) => { s(12, 11, '@'); s(37, 11, '@'); s(20, 8, '$'); }) },
    { name: 'The Last Keg', mode: 'waves', dark: .75, hordeStop: 6, sign: 'THE POWDER KING · he calls every creature in town',
      map: () => throne(({ s }) => { s(0, 14, '&'); s(20, 8, '$'); }) },
  ];

  // Where each arena's sign sits: just above head height on its starting floor.
  const signY = map => { const y = map.findIndex(row => row.includes('P')); return y - 1.6; };
  const arena = (k, round) => {
    const f = FIGHTS[k], map = f.map(), type = map.join('').match(/[5-9]/)[0];
    return {
      name: f.name, dark: f.dark, map, bossMode: f.mode, bossHp: HP[round],
      signs: [{ x: 2, y: signY(map), t: f.sign }],
      ...(f.hordeStop != null ? { hordeStop: f.hordeStop } : {}),
      ...(SPEED[round] > 1 ? { tuning: { [type]: { speed: SPEED[round] } } } : {}),
    };
  };

  // Insert from the back so the earlier positions don't shift.
  const L = LF.LEVELS;
  for (let k = Math.min(FIGHTS.length, Math.floor(L.length / 10)) - 1; k >= 0; k--) {
    const at = (k + 1) * 10;
    L.splice(at, 0, { ...arena(k, Math.floor(k / 5)), chapter: L[at - 1].chapter, boss: true });
  }
})();
