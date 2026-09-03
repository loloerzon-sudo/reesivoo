/**
 * High-quality synthesized "Ka-ching! 💰" coin & cash register chime using Web Audio API
 */
export function playKachingSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Bell chime 1: crisp cash register bell ding
    playMetallicDing(ctx, 1567.98, now, 0.4, 0.35); // G6
    playMetallicDing(ctx, 2349.32, now + 0.05, 0.4, 0.3); // D7

    // Shimmering coin cascade
    playMetallicDing(ctx, 2637.02, now + 0.12, 0.55, 0.25); // E7
    playMetallicDing(ctx, 3135.96, now + 0.18, 0.7, 0.2); // G7
  } catch (_) {
    // Gracefully ignore audio errors if browser blocks auto-audio
  }
}

function playMetallicDing(ctx, freq, startTime, duration, volume) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // 'triangle' gives a richer metallic brass overtone than pure sine
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, startTime);

  // Quick attack, smooth exponential decay
  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}
