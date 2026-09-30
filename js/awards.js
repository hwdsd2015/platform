// Lanternfall awards: counters and one-off feats, saved in this browser, with a toast when earned.
(() => {
  const LF = window.LF;
  const KEY = 'lanternfall.awards', STATS = 'lanternfall.stats';
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  let got = load(KEY, {}), stats = load(STATS, {});

  // goal + stat: a counter award with a progress bar. Otherwise it's earned by a one-off check.
  const AWARDS = [
    { id: 'first', name: 'First Light', desc: 'Clear the first level.' },
    { id: 'clear10', name: 'Lamplighter', desc: 'Clear 10 story levels.', stat: 'storyLit', goal: 10 },
    { id: 'clear25', name: 'Halfway Home', desc: 'Clear 25 story levels.', stat: 'storyLit', goal: 25 },
    { id: 'clearAll', name: 'Every Lamp Burns', desc: 'Clear every story level.', stat: 'storyLit', goal: () => LF.LEVELS.length },
    { id: 'flawless', name: 'Not a Scratch', desc: 'Clear a level without falling once.' },
    { id: 'quick', name: 'Quick Flame', desc: 'Clear a story level in under 15 seconds.' },
    { id: 'hc1', name: 'Hard as Wax', desc: 'Clear a level on Hardcore.' },
    { id: 'hc10', name: 'Iron Wick', desc: 'Clear 10 story levels on Hardcore.', stat: 'hcLit', goal: 10 },
    { id: 'horde', name: 'Outran the Dark', desc: 'Clear a level with a horde in it.' },
    { id: 'random', name: 'Wanderer', desc: 'Clear a random map.' },
    { id: 'stomp', name: 'Stompy', desc: 'Stomp 50 enemies.', stat: 'stomp', goal: 50 },
    { id: 'zap', name: 'Sharpshooter', desc: 'Shoot 100 enemies.', stat: 'zap', goal: 100 },
    { id: 'golem', name: 'Giant Slayer', desc: 'Bring down an iron golem.' },
    { id: 'bubble', name: 'Bubble Popper', desc: 'Shoot a lava bubble out of the air.' },
    { id: 'wall', name: 'Wall Runner', desc: 'Wall jump 100 times.', stat: 'walljump', goal: 100 },
    { id: 'djump', name: 'Second Wind', desc: 'Double jump 25 times.', stat: 'djump', goal: 25 },
    { id: 'swim', name: 'Deep Diver', desc: 'Kick 50 times while swimming.', stat: 'swim', goal: 50 },
    { id: 'fruit', name: 'Fruit Salad', desc: 'Eat an apple, an orange and a banana.', stat: 'fruitKinds', goal: 3 },
    { id: 'shield', name: 'Close Call', desc: 'Let an apple shield take a hit for you.' },
    { id: 'keys', name: 'Keymaster', desc: 'Unlock 20 locked-door blocks.', stat: 'unlock', goal: 20 },
    { id: 'crates', name: 'Challenge Accepted', desc: 'Grab 5 big ammo crates.', stat: 'bigammo', goal: 5 },
    { id: 'falls', name: 'Persistence', desc: 'Fall 100 times. It happens.', stat: 'falls', goal: 100 },
    { id: 'architect', name: 'Architect', desc: 'Save a level of your own.' },
  ];
  const goalOf = a => (typeof a.goal === 'function' ? a.goal() : a.goal);

  // Toasts queue up so two awards at once both get seen.
  const queue = [];
  let showing = false;
  function toast(a) { queue.push(a); if (!showing) next(); }
  function next() {
    const el = document.getElementById('award-toast');
    const a = queue.shift();
    if (!el || !a) { showing = false; return; }
    showing = true;
    el.innerHTML = `<span>Award</span><b>${a.name}</b><small>${a.desc}</small>`;
    el.classList.add('show');
    LF.awards.onEarn && LF.awards.onEarn(a);
    setTimeout(() => { el.classList.remove('show'); setTimeout(next, 400); }, 2800);
  }

  function earn(id) {
    if (got[id]) return;
    got[id] = Date.now(); save(KEY, got);
    toast(AWARDS.find(a => a.id === id));
  }
  function bump(stat, n = 1) {
    stats[stat] = (stats[stat] || 0) + n; save(STATS, stats);
    check();
  }
  function check() {
    for (const a of AWARDS) if (a.stat && !got[a.id] && (stats[a.stat] || 0) >= goalOf(a)) earn(a.id);
  }

  LF.awards = {
    list: () => AWARDS.map(a => ({ ...a, goal: a.stat ? goalOf(a) : null, have: a.stat ? Math.min(stats[a.stat] || 0, goalOf(a)) : null, earned: !!got[a.id] })),
    count: () => ({ earned: AWARDS.filter(a => got[a.id]).length, total: AWARDS.length }),
    // Game events from the play loop.
    event(ev) {
      const d = ev.data || {};
      if (ev.type === 'stomp') bump('stomp');
      else if (ev.type === 'zap') { bump('zap'); if (d.type === 'I') earn('golem'); if (d.type === '*') earn('bubble'); }
      else if (ev.type === 'walljump') bump('walljump');
      else if (ev.type === 'djump') bump('djump');
      else if (ev.type === 'swim') bump('swim');
      else if (ev.type === 'unlock') bump('unlock');
      else if (ev.type === 'bigammo') bump('bigammo');
      else if (ev.type === 'shield') earn('shield');
      else if (ev.type === 'die') bump('falls');
      else if (ev.type === 'fruit') {
        const kinds = new Set(stats.fruitSeen || []); kinds.add(d.type);
        stats.fruitSeen = [...kinds]; bump('fruitKinds', kinds.size - (stats.fruitKinds || 0));
      }
    },
    // A level was cleared.
    clear({ kind, index, time, falls, hardcore, horde, storyLit, hcLit }) {
      if (kind === 'story') {
        if (index === 0) earn('first');
        if (time < 15) earn('quick');
        stats.storyLit = storyLit; stats.hcLit = hcLit; save(STATS, stats);
      }
      if (kind === 'random') earn('random');
      if (kind !== 'test') {
        if (falls === 0) earn('flawless');
        if (hardcore) earn('hc1');
        if (horde) earn('horde');
      }
      check();
    },
    saved() { earn('architect'); },
    // Catch up with levels cleared before awards existed.
    sync({ storyLit, hcLit, first }) {
      stats.storyLit = Math.max(stats.storyLit || 0, storyLit); stats.hcLit = Math.max(stats.hcLit || 0, hcLit); save(STATS, stats);
      if (first) earn('first');
      if (hcLit) earn('hc1');
      check();
    },
    reset() { got = {}; stats = {}; save(KEY, got); save(STATS, stats); },
  };
})();
