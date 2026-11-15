// Tiny synth: a few WebAudio blips, no files, no network. The context only starts on
// the player's first input (browsers demand a gesture), and every call is guarded, so
// a headless screenshot run never hears — or breaks on — a sound.
let ctx = null;

function ensure() {
  if (ctx) return ctx;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    ctx = new AudioContext();
  } catch {
    return null;
  }
  return ctx;
}

function blip(freq, dur, type, gain, slideTo) {
  const ac = ensure();
  if (!ac) return;
  try {
    if (ac.state === 'suspended') void ac.resume();
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + dur);
    amp.gain.setValueAtTime(gain, ac.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    osc.connect(amp);
    amp.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + dur);
  } catch {
    // Sound is garnish: never let it break the game.
  }
}

export function unlockAudio() {
  ensure();
}

export const sfx = {
  pickup(combo) {
    blip(620 + Math.min(8, combo) * 45, 0.12, 'sine', 0.12, 940 + Math.min(8, combo) * 45);
  },
  hit() {
    blip(160, 0.3, 'sawtooth', 0.16, 55);
  },
  level() {
    blip(523, 0.1, 'triangle', 0.12);
    setTimeout(() => blip(659, 0.1, 'triangle', 0.12), 90);
    setTimeout(() => blip(784, 0.18, 'triangle', 0.14), 180);
  },
  shield() {
    blip(440, 0.16, 'triangle', 0.1, 880);
  },
  dash() {
    blip(300, 0.14, 'sine', 0.08, 720);
  },
  over() {
    blip(220, 0.5, 'sawtooth', 0.14, 48);
  },
};
