export const audioCtxRef = { current: null as AudioContext | null };
const masterCompRef = { current: null as DynamicsCompressorNode | null };

function getAudio(): { ctx: AudioContext; out: AudioNode } | null {
  try {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
      const comp = audioCtxRef.current.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.knee.value = 6;
      comp.ratio.value = 5;
      comp.attack.value = 0.002;
      comp.release.value = 0.15;
      comp.connect(audioCtxRef.current.destination);
      masterCompRef.current = comp;
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    return { ctx: audioCtxRef.current, out: masterCompRef.current! };
  } catch { return null; }
}

function tone(
  ctx: AudioContext, out: AudioNode,
  type: OscillatorType, freqStart: number, freqEnd: number | null,
  start: number, dur: number, peak: number,
  attack = 0.007, release = 0.055,
) {
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.connect(g); g.connect(out);
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, start);
  if (freqEnd !== null) osc.frequency.linearRampToValueAtTime(freqEnd, start + dur);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(peak, start + attack);
  g.gain.setValueAtTime(peak, Math.max(start + attack, start + dur - release));
  g.gain.linearRampToValueAtTime(0, start + dur);
  osc.start(start);
  osc.stop(start + dur + 0.01);
}

function playRocketAlert(ctx: AudioContext, out: AudioNode, t: number, vol: number) {
  [523, 659, 784].forEach((freq, i) => {
    const s = t + i * 0.18;
    tone(ctx, out, 'sine',     freq,     null, s,        0.24, vol * 0.55, 0.012, 0.12);
    tone(ctx, out, 'triangle', freq * 2, null, s,        0.20, vol * 0.10, 0.012, 0.12);
    tone(ctx, out, 'sine',     freq,     null, s + 0.68, 0.22, vol * 0.45, 0.012, 0.12);
  });
}

function playMissileKlaxon(ctx: AudioContext, out: AudioNode, t: number, vol: number) {
  [[659, 494], [587, 440], [659, 494]].forEach(([hi, lo], i) => {
    const s = t + i * 0.46;
    tone(ctx, out, 'sine', hi, null, s,        0.28, vol * 0.48, 0.015, 0.20);
    tone(ctx, out, 'sine', lo, null, s + 0.15, 0.26, vol * 0.38, 0.015, 0.20);
  });
}

function playDroneBuzz(ctx: AudioContext, out: AudioNode, t: number, vol: number) {
  [0, 0.18, 0.36, 0.58, 0.76].forEach((off, i) =>
    tone(ctx, out, 'sine', i % 2 === 0 ? 880 : 660, null, t + off, 0.13, vol * 0.42, 0.010, 0.08)
  );
}

function playAircraftAlert(ctx: AudioContext, out: AudioNode, t: number, vol: number) {
  [523, 659, 784, 1047].forEach((freq, i) => {
    const s = t + i * 0.20;
    tone(ctx, out, 'sine',     freq, null, s, 0.28, vol * 0.46, 0.015, 0.18);
    tone(ctx, out, 'triangle', freq, null, s, 0.24, vol * 0.10, 0.015, 0.18);
  });
}

function playBallisticAlert(ctx: AudioContext, out: AudioNode, t: number, vol: number) {
  tone(ctx, out, 'sine', 220, 260, t,        0.50, vol * 0.40, 0.035, 0.30);
  tone(ctx, out, 'sine', 330, 740, t + 0.45, 0.75, vol * 0.38, 0.060, 0.15);
  [1.30, 1.50, 1.70].forEach((off, i) =>
    tone(ctx, out, 'sine', 880 + i * 110, null, t + off, 0.14, vol * 0.36, 0.010, 0.09)
  );
}

function playCruiseMissile(ctx: AudioContext, out: AudioNode, t: number, vol: number) {
  tone(ctx, out, 'sine', 880, 330, t, 0.65, vol * 0.40, 0.025, 0.20);
  [0.75, 0.98].forEach(off =>
    tone(ctx, out, 'sine', 660, null, t + off, 0.18, vol * 0.36, 0.012, 0.10)
  );
}

function playSirenWail(ctx: AudioContext, out: AudioNode, t: number, vol: number, cycles = 1) {
  for (let c = 0; c < cycles; c++) {
    const s = t + c * 1.8;
    tone(ctx, out, 'sine', 330, 880, s,        0.88, vol * 0.45, 0.12, 0.14);
    tone(ctx, out, 'sine', 880, 330, s + 0.88, 0.85, vol * 0.45, 0.06, 0.14);
  }
}

export function playAlertSound(threatType?: string, volume: number = 70) {
  try {
    const audio = getAudio();
    if (!audio) return;
    const { ctx, out } = audio;
    const vol = Math.max(0, Math.min(1, volume / 100)) * 0.10;
    const t = ctx.currentTime;
    if      (threatType === 'ballistic_missile')          playBallisticAlert(ctx, out, t, vol);
    else if (threatType === 'cruise_missile')             playCruiseMissile(ctx, out, t, vol);
    else if (threatType === 'missiles')                   playMissileKlaxon(ctx, out, t, vol);
    else if (threatType === 'uav_intrusion' ||
             threatType === 'drone_swarm')                playDroneBuzz(ctx, out, t, vol);
    else if (threatType === 'hostile_aircraft_intrusion') playAircraftAlert(ctx, out, t, vol);
    else                                                  playRocketAlert(ctx, out, t, vol);
  } catch (_) {}
}

export function playSirenAlert(volume: number = 70) {
  try {
    const audio = getAudio();
    if (!audio) return;
    playSirenWail(audio.ctx, audio.out, audio.ctx.currentTime, Math.max(0, Math.min(1, volume / 100)) * 0.09, 1);
  } catch (_) {}
}

export function playTelegramSound(volume: number = 70) {
  try {
    const audio = getAudio();
    if (!audio) return;
    const { ctx, out } = audio;
    const vol = Math.max(0, Math.min(1, volume / 100)) * 0.12;
    const t = ctx.currentTime;
    [1200, 1560, 1800].forEach((freq, i) =>
      tone(ctx, out, 'sine', freq, null, t + i * 0.09, 0.11, vol * (1 - i * 0.18), 0.007, 0.05)
    );
  } catch (_) {}
}
