// Lanternfall: music. Every track is composed on the fly from a seed: a chord progression,
// a melody that walks over it (landing on the chord's notes on the strong beats), a bass
// line, a soft pad and a few drums, eight bars that loop. Each world has its own key, mode
// and tempo; boss towers, the castle, the map and the fruit groves have their own too.
// Played with Web Audio through a little look-ahead scheduler. No DOM. ui.js hands over its
// AudioContext (LF.music.attach) once you've pressed something, and says what to play.
(() => {
  const LF = window.LF;
  const M = LF.music = {};
  const SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11], mixo: [0, 2, 4, 5, 7, 9, 10], harmonic: [0, 2, 3, 5, 7, 8, 11],
  };
  // Chord progressions (scale degrees of each bar's chord), per mode.
  const PROGS = {
    major: [[0, 5, 3, 4], [0, 3, 4, 3], [0, 4, 5, 3]], minor: [[0, 5, 2, 6], [0, 3, 6, 4], [0, 6, 5, 4]],
    dorian: [[0, 3, 0, 6], [0, 6, 3, 4]], lydian: [[0, 1, 0, 4], [0, 1, 5, 4]], mixo: [[0, 6, 3, 0], [0, 3, 6, 4]],
    harmonic: [[0, 0, 5, 4], [0, 3, 4, 4]],
  };
  // What each track is: mode, root note (MIDI), tempo, feel (calm: pad and soft hats;
  // drive: full drums; boss: driving bass and drums), and a seed.
  const TRACKS = {
    map: { mode: 'major', root: 60, bpm: 92, feel: 'calm', seed: 11 },
    grove: { mode: 'major', root: 65, bpm: 150, feel: 'drive', seed: 77 },
    // Towers: the climb and battlements; the castle's climb. (Each boss's own fight music
    // is made from its name: see fightTrack. The final boss has its own.)
    tower: { mode: 'harmonic', root: 57, bpm: 132, feel: 'boss', seed: 31 },
    castle: { mode: 'minor', root: 50, bpm: 112, feel: 'boss', seed: 41 },
    final: { mode: 'harmonic', root: 50, bpm: 160, feel: 'fight', seed: 99 },
    world0: { mode: 'major', root: 62, bpm: 104, feel: 'drive', seed: 1 },      // Old Town
    world1: { mode: 'mixo', root: 60, bpm: 98, feel: 'drive', seed: 2 },        // the Waterfront
    world2: { mode: 'dorian', root: 57, bpm: 112, feel: 'drive', seed: 3 },     // the Clockwork Quarter
    world3: { mode: 'lydian', root: 65, bpm: 96, feel: 'calm', seed: 4 },       // the Sky Roads
    world4: { mode: 'mixo', root: 62, bpm: 100, feel: 'drive', seed: 5 },       // the Canal District
    world5: { mode: 'major', root: 64, bpm: 108, feel: 'drive', seed: 6 },      // the Garden Market
    world6: { mode: 'minor', root: 57, bpm: 110, feel: 'drive', seed: 7 },      // the Smokelands
    world7: { mode: 'dorian', root: 59, bpm: 106, feel: 'calm', seed: 8 },      // the Glass Mines
    world8: { mode: 'minor', root: 55, bpm: 96, feel: 'drive', seed: 9 },       // Night's End
  };
  const RHYTHMS = [[0, 3, 6, 8, 10, 12, 14], [0, 2, 4, 6, 8, 11, 12, 14], [0, 4, 6, 8, 12, 14], [0, 2, 3, 6, 8, 10, 12], [0, 3, 4, 8, 11, 12]];

  // A boss fight's music: 'fight:<name>' — fast, heavy and minor, with its own key, tempo,
  // mode and tune from the boss's name.
  function fightTrack(name) {
    let h = 7; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return { mode: ['harmonic', 'minor', 'dorian', 'harmonic'][h % 4], root: 52 + (h >> 3) % 7, bpm: 146 + (h >> 6) % 5 * 4, feel: 'fight', seed: h % 100000 };
  }
  const cache = {};
  function compose(name) {
    if (cache[name]) return cache[name];
    const t = name.startsWith('fight:') ? fightTrack(name.slice(6)) : TRACKS[name] || TRACKS.map, R = LF.rng(t.seed * 7919 + 13), scale = SCALES[t.mode];
    const prog = PROGS[t.mode][Math.floor(R() * PROGS[t.mode].length)];
    const pitch = d => t.root + scale[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
    const chordTones = c => [c, c + 2, c + 4];
    // A bar of melody over chord c: a rhythm, then a walk in scale steps that lands on the
    // chord's notes on the strong beats (and ends a phrase on the chord's root).
    let deg = 7 + prog[0];
    const bar = (c, end) => {
      const lead = Array(16).fill(null), rh = RHYTHMS[Math.floor(R() * RHYTHMS.length)];
      for (const s of rh) {
        deg += [-2, -1, -1, 1, 1, 2, 0][Math.floor(R() * 7)];
        if (s % 4 === 0) { const ct = chordTones(c).flatMap(x => [x + 7, x + 14]); deg = ct.reduce((a, b) => (Math.abs(b - deg) < Math.abs(a - deg) ? b : a)); }
        deg = Math.max(5, Math.min(16, deg));
        lead[s] = pitch(deg);
      }
      if (end) { for (let s = 12; s < 16; s++) lead[s] = null; lead[12] = pitch(7 + c); }
      return lead;
    };
    const A = prog.map((c, k) => bar(c, k === 3));
    const B = prog.map((c, k) => (k < 2 ? A[k] : bar(c, k === 3)));
    const bars = [...A, ...B].map((lead, k) => {
      const c = prog[k % 4];
      const bass = Array(16).fill(null);
      if (t.feel === 'fight') for (let s = 0; s < 16; s++) bass[s] = s % 4 === 3 ? null : pitch(c) - 24 + (s % 8 === 6 ? 12 : s % 8 === 7 ? 7 : 0);
      else if (t.feel === 'boss') for (let s = 0; s < 16; s += 2) bass[s] = pitch(c) - 24 + (s % 8 === 6 ? 7 : 0);
      else for (const s of [0, 4, 8, 12]) bass[s] = pitch(c) - 24 + (s === 8 && t.feel !== 'calm' ? 7 : 0);
      return { lead, bass, chord: chordTones(c).map(d => pitch(d) - 12) };
    });
    return cache[name] = { ...t, bars };
  }

  // ---- voices ----
  let ac = null, out = null, noiseBuf = null;
  function voice(f, t, dur, type, v, attack = .01) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + .05);
  }
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  function kick(t, v) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + .12);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + .16);
    o.connect(g).connect(out); o.start(t); o.stop(t + .2);
  }
  function noise(t, v, dur, type, freq) {
    if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate * .3, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f).connect(g).connect(out); s.start(t); s.stop(t + dur + .02);
  }
  function playStep(tr, i, t) {
    const b = tr.bars[Math.floor(i / 16)], s = i % 16, spb = 60 / tr.bpm / 4;
    if (b.lead[s]) voice(hz(b.lead[s]), t, spb * (tr.feel === 'calm' ? 3.5 : 2.2), tr.feel === 'calm' ? 'triangle' : 'square', tr.feel === 'calm' ? .05 : .022);
    if (b.bass[s]) voice(hz(b.bass[s]), t, spb * (tr.feel === 'fight' ? .9 : tr.feel === 'boss' ? 1.8 : 3.6), tr.feel === 'fight' ? 'sawtooth' : 'triangle', tr.feel === 'fight' ? .04 : .07);
    if (s === 0 && tr.feel === 'calm') for (const n of b.chord) voice(hz(n), t, spb * 16, 'sine', .018, .4);
    if (tr.feel === 'calm') { if (s === 4 || s === 12) noise(t, .012, .04, 'highpass', 7000); return; }
    if (tr.feel === 'fight') {
      // A fight: hats on every step, kicks driving, snares on the backbeat with a fill at the
      // end of every fourth bar, and a crash at the top of each phrase.
      const bar = Math.floor(i / 16);
      noise(t, s % 2 ? .012 : .024, .03, 'highpass', 8000);
      if ([0, 3, 6, 8, 11, 14].includes(s)) kick(t, .24);
      if (s === 4 || s === 12 || (bar % 4 === 3 && s >= 13)) noise(t, .08, .11, 'bandpass', 1900);
      if (s === 0 && bar % 4 === 0) noise(t, .05, .6, 'highpass', 5000);
      return;
    }
    if (s % 2 === 0) noise(t, tr.feel === 'boss' ? .022 : .014, .035, 'highpass', 7000);
    if (s === 0 || s === 8 || (tr.feel === 'boss' && (s === 3 || s === 10))) kick(t, .22);
    if (s === 4 || s === 12) noise(t, .07, .12, 'bandpass', 1800);
  }

  // ---- the scheduler ----
  let track = null, want = 'map', step = 0, nextT = 0, timer = null, on = true, muted = false, duck = 1;
  const level = () => (on && !muted ? .5 * duck : 0);
  function tick() {
    if (!ac || !track || ac.state !== 'running') return;
    const spb = 60 / track.bpm / 4;
    if (nextT < ac.currentTime) nextT = ac.currentTime + .05;
    while (nextT < ac.currentTime + .15) {
      if (level() > 0) playStep(track, step, nextT);
      nextT += spb; step = (step + 1) % (track.bars.length * 16);
    }
  }
  function start(name) {
    track = compose(name); step = 0;
    if (ac) {
      nextT = ac.currentTime + .08;
      out.gain.cancelScheduledValues(ac.currentTime); out.gain.setValueAtTime(0, ac.currentTime); out.gain.linearRampToValueAtTime(level(), ac.currentTime + .6);
    }
  }
  M.attach = context => {
    if (ac || !context) return;
    ac = context; out = ac.createGain(); out.gain.value = 0; out.connect(ac.destination);
    timer = setInterval(tick, 25);
    start(want);
  };
  // Play a track (by name: map, grove, tower, castle, final, world0…world8, or fight:<boss>);
  // the same one keeps going.
  M.play = name => { if (name === want && track) return; want = name; if (ac) start(name); };
  const setLevel = () => { if (ac) { out.gain.cancelScheduledValues(ac.currentTime); out.gain.setTargetAtTime(level(), ac.currentTime, .08); } };
  M.setOn = v => { on = v; setLevel(); };
  M.setMuted = v => { muted = v; setLevel(); };
  M.duck = v => { duck = v ? .35 : 1; setLevel(); };
  M.isOn = () => on;
  // (For checking it's playing: the track, the step it's on, the volume.)
  M.status = () => ({ track: want, step, level: level(), running: !!(ac && ac.state === 'running') });
})();
