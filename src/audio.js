import { vehicleSoundPosition } from './audio-space.js';
const MUSIC_URL = new URL('../assets/audio/pagode-loop.wav', import.meta.url).href;

// One quiet ambience bus, short arcade Foley, and the original pagode loop.
export class AudioKit {
  constructor() {
    this.muted = true;
    this.context = null;
    this.enabled = false;
    this.music = null;
    this.lastCluck = 0;
    this.hidden = false;
    this.voices = [];
    this.honked = new WeakMap();
    this.nextHorn = 0;
    this.stepCount = 0;
  }
  unlock() {
    try {
      if (!this.context) {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) return;
        this.context = new Context();
        this.master = this.context.createGain();
        this.master.gain.value = .7;
        this.master.connect(this.context.destination);
        this.noise = this.context.createBuffer(1, this.context.sampleRate * 2, this.context.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        for (let i = 0; i < 6; i++) {
          const voice = this.ambient('sawtooth', 62, 'lowpass', 260);
          const harmonic = this.context.createOscillator();
          harmonic.type = 'triangle'; harmonic.frequency.value = 31;
          const body = this.context.createGain(); body.gain.value = .45;
          harmonic.connect(body); body.connect(voice.filter); harmonic.start();
          voice.harmonic = harmonic;
          this.voices.push(voice);
        }
        this.water = this.ambient(null, 0, 'lowpass', 650);
      }
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
    } catch { /* Browsers without Web Audio can still play the soundtrack. */ }
  }
  ambient(type, frequency, filterType, cutoff) {
    const ctx = this.context, source = type ? ctx.createOscillator() : ctx.createBufferSource();
    if (type) { source.type = type; source.frequency.value = frequency; }
    else { source.buffer = this.noise; source.loop = true; }
    const filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    filter.type = filterType; filter.frequency.value = cutoff; gain.gain.value = 0;
    const pan = ctx.createStereoPanner?.();
    source.connect(filter); filter.connect(gain);
    if (pan) { gain.connect(pan); pan.connect(this.master); } else gain.connect(this.master);
    source.start();
    return { source, gain, pan, filter };
  }
  start() {
    if (!this.enabled) { this.enabled = true; this.setMuted(false); }
    else this.setMuted(this.muted);
  }
  setMuted(muted) {
    this.muted = muted;
    this.enabled = true;
    if (!muted && !this.hidden) {
      this.unlock();
      if (!this.music && typeof Audio !== 'undefined') {
        this.music = new Audio(MUSIC_URL);
        this.music.loop = true;
        this.music.volume = .10;
        this.music.preload = 'auto';
      }
      this.music?.play().catch(() => {});
    } else this.music?.pause();
    if (this.master) this.master.gain.setTargetAtTime(muted || this.hidden ? 0 : .7, this.context.currentTime, .025);
  }
  setHidden(hidden) { this.hidden = hidden; if (this.enabled) this.setMuted(this.muted); }
  tone(frequency, end, duration, volume = .08, type = 'triangle', delay = 0, destination = this.master) {
    const ctx = this.context, now = ctx.currentTime + delay, osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(end, now + duration);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    osc.connect(gain); gain.connect(destination); osc.start(now); osc.stop(now + duration + .02);
  }
  burst(duration, cutoff, volume) {
    const ctx = this.context, now = ctx.currentTime, source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    source.buffer = this.noise; filter.type = 'lowpass'; filter.frequency.setValueAtTime(cutoff, now); filter.frequency.exponentialRampToValueAtTime(90, now + duration);
    gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    source.connect(filter); filter.connect(gain); gain.connect(this.master); source.start(); source.stop(now + duration);
  }
  play(effect) {
    if (this.muted || this.hidden || !this.context) return;
    try {
      if (effect === 'step' || effect === 'wood') {
        const wood = effect === 'wood', variation = .93 + Math.random() * .14;
        this.stepCount++;
        // Dry little footfall followed by a softer toe tap, rather than a beep.
        this.tone((wood ? 310 : 155) * variation, wood ? 155 : 78, .038, .052, 'sine');
        this.tone((wood ? 420 : 230) * variation, 120, .026, .023, 'triangle', .025);
        this.burst(wood ? .028 : .045, wood ? 1900 : 1100, .032);
        if (this.context.currentTime - this.lastCluck > .85 && this.stepCount % 3 === 0) {
          this.lastCluck = this.context.currentTime;
          this.cluck(variation);
        }
      } else if (effect === 'splash') {
        this.burst(.65, 4000, .22);
        this.tone(480, 70, .4, .12, 'sine');
      } else if (effect === 'hit') {
        this.burst(.18, 1800, .2);
        this.tone(150, 40, .3, .14, 'triangle');
        this.tone(750, 180, .22, .06, 'triangle', .025);
      } else if (effect === 'victory') {
        // A short major fanfare, distinct from the ordinary pickup chime.
        [523.25, 659.25, 783.99, 1046.5].forEach((note, i) =>
          this.tone(note, note, i === 3 ? .55 : .18, .075, 'triangle', i * .12));
        [523.25, 659.25, 783.99].forEach(note =>
          this.tone(note, note, .5, .035, 'sine', .48));
      } else if (effect === 'checkpoint') {
        [660, 880, 1100].forEach((note, i) => this.tone(note, note, .13, .065, 'sine', i * .07));
      } else if (effect === 'start') {
        [330, 440, 660].forEach((note, i) => this.tone(note, note, .12, .055, 'triangle', i * .08));
      }
    } catch { /* Audio must never interrupt the game loop. */ }
  }
  checkpoint() { this.play('checkpoint'); }
  cluck(variation = 1) {
    const ctx = this.context, now = ctx.currentTime;
    // Rounded, throaty "buk-buk": formant filtering removes the whistle quality.
    for (const [delay, length, pitch, volume] of [[0, .085, 265, .11], [.105, .12, 225, .075]]) {
      const osc = ctx.createOscillator(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(pitch * variation, now + delay);
      osc.frequency.exponentialRampToValueAtTime(pitch * 1.35 * variation, now + delay + .018);
      osc.frequency.exponentialRampToValueAtTime(pitch * .65 * variation, now + delay + length);
      filter.type = 'bandpass'; filter.frequency.value = 1050 * variation; filter.Q.value = 1.8;
      gain.gain.setValueAtTime(.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(volume, now + delay + .009);
      gain.gain.exponentialRampToValueAtTime(.0001, now + delay + length);
      osc.connect(filter); filter.connect(gain); gain.connect(this.master);
      osc.start(now + delay); osc.stop(now + delay + length + .01);
    }
  }
  horn(voice, car) {
    const truck = car.type === 'truck', base = truck ? 175 : 350;
    // Two reeds, with a short second toot for lighter vehicles.
    for (const delay of truck ? [0] : [0, .19]) {
      this.tone(base, base * .98, truck ? .34 : .13, .8, 'sawtooth', delay, voice.gain);
      this.tone(base * 1.26, base * 1.24, truck ? .34 : .13, .45, 'square', delay, voice.gain);
    }
  }
  update(scene) {
    if (!this.context || !this.water) return;
    const now = this.context.currentTime, active = scene.mode === 'playing' && !this.muted && !this.hidden;
    const candidates = active ? scene.cars.map(car => ({car, ...vehicleSoundPosition(car, scene)}))
      .filter(sound => sound.level > .015).sort((a, b) => b.level - a.level).slice(0, 6) : [];
    const selected = new Set(candidates.map(sound => sound.car));
    // Fade retired voices before reassignment so recycling never teleports sound.
    for (const voice of this.voices) {
      if (voice.car && !selected.has(voice.car)) {
        voice.gain.gain.setTargetAtTime(0, now, .06);
        if (!voice.releaseAt) voice.releaseAt = now + .3;
        if (now >= voice.releaseAt) { voice.car = null; voice.releaseAt = 0; }
      }
    }
    for (const sound of candidates) {
      let voice = this.voices.find(voice => voice.car === sound.car);
      if (!voice) {
        voice = this.voices.find(voice => !voice.car);
        if (!voice) continue;
        voice.car = sound.car;
      }
      voice.releaseAt = 0;
      const truck = sound.car.type === 'truck';
      const rpm = (truck ? 39 : 61) + Math.min(160, Math.abs(sound.car.speed)) * (truck ? .22 : .32);
      voice.source.frequency.setTargetAtTime(rpm * sound.pitch, now, .08);
      voice.harmonic.frequency.setTargetAtTime(rpm * .5 * sound.pitch, now, .08);
      voice.filter.frequency.setTargetAtTime((truck ? 210 : 330) + sound.level * 220, now, .1);
      voice.gain.gain.setTargetAtTime(sound.level * (truck ? .065 : .045), now, .07);
      voice.pan?.pan.setTargetAtTime(sound.pan, now, .055);
      if (sound.approaching && sound.distance < 1.35 && Math.abs(sound.car.lane - scene.worldProgress) < 1.4 &&
          now > this.nextHorn && now - (this.honked.get(sound.car) ?? -Infinity) > 8) {
        this.horn(voice, sound.car);
        this.honked.set(sound.car, now); this.nextHorn = now + 2.4;
      }
    }
    let river = 0;
    if (active) for (const row of scene.rows.values()) if (row.kind === 'water')
      river = Math.max(river, Math.max(0, 1 - Math.abs(row.lane - scene.worldProgress) / 4));
    this.water.gain.gain.setTargetAtTime(active ? river * .065 : 0, now, .2);
  }
}
