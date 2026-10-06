// Lanternfall: worlds and forks on the map. Load after secrets.js, so level indexes are final.
// - Worlds group the chapters. On the map each world is a region of its own, and at the
//   end of each one a cannon fires the lamplighter to the start of the next (lv.world is
//   the world's index; LF.WORLDS[w].first / .last are its first and last level indexes).
// - Forks: some levels open two ways on, the next level and the one after it, so you can
//   skip one (lv.alsoUnlocks lists the extra level indexes). Never across a world's end.
(() => {
  const LF = window.LF, L = LF.LEVELS;
  const WORLDS = [
    { name: 'Old Town', chapters: ['The Chandlery', 'The Belfry', 'The Kilns', 'The Hollow Spire'] },
    { name: 'The Waterfront', chapters: ['The Orchard', 'The Drowned Quarter', 'The Lighthouse'] },
    { name: 'The Clockwork Quarter', chapters: ['The Clockworks', 'The Frost Roofs', 'The Clock Tower', 'The Vault', 'The Horde', 'The Powder Works'] },
    { name: 'The Canal District', chapters: ['The Tallow Docks', 'The Soot Canals'] },
    { name: 'The Garden Market', chapters: ['The Wax Market', 'The Ember Gardens'] },
    { name: 'The Smokelands', chapters: ['The Smoke Stacks', 'The Ash Barrens', 'The Bell Foundry'] },
    { name: 'The Glass Mines', chapters: ['The Glass Works', 'The Moth Archive', 'The Cinder Mines'] },
    { name: 'Night’s End', chapters: ['The Wick Bridges', 'The Ember Coast', 'The Chimney Peaks', 'The Last Lamps', 'The Dawn Tower', 'The Last Night'] },
  ];
  const worldOf = {};
  WORLDS.forEach((w, k) => w.chapters.forEach(c => { worldOf[c] = k; }));
  L.forEach((lv, i) => { lv.world = worldOf[lv.chapter] ?? WORLDS.length - 1; });
  WORLDS.forEach((w, k) => {
    w.first = L.findIndex(lv => lv.world === k);
    w.last = L.length - 1 - [...L].reverse().findIndex(lv => lv.world === k);
  });
  LF.WORLDS = WORLDS;

  // Forks: every sixth regular level (from the fifth), if the level two on is in the same
  // world and the one it lets you skip isn't a boss fight (bosses can't be dodged).
  let r = 0;
  L.forEach((lv, i) => {
    if (lv.boss) return;
    if (r++ % 6 === 4 && i + 2 < L.length && L[i + 2].world === lv.world && !L[i + 1].boss && !L[i + 2].finalFight) lv.alsoUnlocks = [i + 2];
  });
})();
