// Simple audio synthesizer to avoid external dependencies
let audioCtx: AudioContext | null = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

export const playSound = (type: 'click' | 'select' | 'found' | 'win' | 'hint') => {
  const ctx = initAudio();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;

  switch (type) {
    case 'click':
      // Short high-pitch blip
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      break;

    case 'select':
      // Soft low blip for starting selection
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
      break;

    case 'found':
      // Pleasant major chord arp
      const frequencies = [440, 554, 659]; // A Major
      frequencies.forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.type = 'triangle';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.1, now + 0.05 + (i * 0.05));
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.5 + (i * 0.05));
        o.start(now);
        o.stop(now + 0.6 + (i * 0.05));
      });
      return; // Special case, oscillators handled above

    case 'win':
      // Victory fanfare sequence
      const winNotes = [523.25, 659.25, 783.99, 1046.50]; // C Major
      winNotes.forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.type = 'square';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0, now + i * 0.1);
        g.gain.linearRampToValueAtTime(0.1, now + i * 0.1 + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4);
        o.start(now + i * 0.1);
        o.stop(now + i * 0.1 + 0.5);
      });
      return;
      
    case 'hint':
      // Mystical shimmer
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.linearRampToValueAtTime(1200, now + 0.3);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
      break;
  }
};
