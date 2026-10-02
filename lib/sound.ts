// Soft synthesized sounds: wooden ticks, a thud, a snip. No jingles, no coin showers.

let ctx: AudioContext | null = null;

function tone(freq: number, dur: number, type: OscillatorType = "triangle", gain = 0.05, delay = 0) {
  try {
    ctx ??= new AudioContext();
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  } catch {
    // audio is optional
  }
}

/** "gyuu": a voiced squeak. Sawtooth through a vowel-ish bandpass, pitch swoops up then sags, with a wobble. */
function gyuu() {
  try {
    ctx ??= new AudioContext();
    const t = ctx.currentTime;
    const base = 420 + Math.random() * 120; // a little different every squeeze
    const osc = ctx.createOscillator();
    const vib = ctx.createOscillator();
    const vibGain = ctx.createGain();
    const formant = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(base * 0.7, t); // the "g"
    osc.frequency.exponentialRampToValueAtTime(base * 1.6, t + 0.07); // "yu"
    osc.frequency.exponentialRampToValueAtTime(base * 1.25, t + 0.42); // "uu"
    vib.frequency.value = 22;
    vibGain.gain.value = base * 0.04;
    vib.connect(vibGain).connect(osc.frequency);
    formant.type = "bandpass";
    formant.frequency.setValueAtTime(900, t);
    formant.frequency.linearRampToValueAtTime(650, t + 0.42); // "y" brightness closing into "oo"
    formant.Q.value = 4;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.03);
    g.gain.setValueAtTime(0.25, t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.48);
    osc.connect(formant).connect(g).connect(ctx.destination);
    osc.start(t);
    vib.start(t);
    osc.stop(t + 0.5);
    vib.stop(t + 0.5);
  } catch {
    // audio is optional
  }
}

export const sfx = {
  gyuu,
  flap: (n: number) => Array.from({ length: n }, (_, i) => tone(180 + (i % 2) * 40, 0.05, "triangle", 0.06, i * 0.25)),
  peg: (state: string) => {
    if (state === "bumper") return tone(140, 0.18, "square", 0.05);
    if (state === "blackhole") return [600, 400, 250].forEach((f, i) => tone(f, 0.1, "sine", 0.04, i * 0.06));
    if (state === "splitter") return [900, 1200].forEach((f, i) => tone(f, 0.05, "square", 0.03, i * 0.04));
    tone(state === "bomb" ? 180 : state === "solid" ? 880 : 620, 0.05, "triangle", 0.03);
  },
  tick: () => tone(1500, 0.015, "square", 0.02),
  card: () => tone(500, 0.04, "triangle", 0.04),
  mega: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.18, "square", 0.04, i * 0.07)),
  bucket: () => tone(330, 0.12, "sine", 0.05),
  correct: () => tone(660, 0.12, "sine", 0.05),
  wrong: () => tone(220, 0.15, "sine", 0.04),
  bomb: () => {
    tone(1200, 0.03, "square", 0.02);
    tone(1200, 0.03, "square", 0.02, 0.25);
    tone(70, 0.35, "sine", 0.12, 0.55);
  },
  defuse: () => {
    tone(2400, 0.03, "square", 0.02);
    tone(990, 0.15, "sine", 0.05, 0.05);
  },
};
