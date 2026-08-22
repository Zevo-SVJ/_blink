/**
 * Blink — the film's sound.
 *
 * ## Synthesised, not sampled
 *
 * Eight cue kinds, each a few oscillators and an envelope. The alternative was
 * eight audio files: roughly 200–400 KB of assets on a landing page whose
 * whole point is that it paints fast, for sound that is muted on arrival and
 * that most visitors will never unmute. Web Audio is already in the browser,
 * so the entire sound design costs zero bytes and zero dependencies.
 *
 * It is also the only version that can stay in sync. The cues are frames, and
 * a synthesised hit fires on the frame it is asked for; a file has to be
 * fetched, decoded and scheduled, and a cache miss puts the impact after the
 * word it is meant to land on.
 *
 * ## Muted until asked
 *
 * A page that makes noise on scroll is a page people leave, and browsers block
 * it anyway — an AudioContext created without a gesture starts suspended. So
 * nothing is constructed until the viewer presses the speaker, which is both
 * the polite behaviour and the one that works.
 *
 * ## Fired once per frame, ever
 *
 * `playUpTo` is given the frame window that has just elapsed and fires every
 * cue inside it. Wall-clock playback drops frames under load, so a cue matched
 * on equality alone would simply be skipped; a window cannot miss one. And
 * because the film is also scrubbable, a jump backwards resets the cursor
 * rather than replaying twenty cues at once.
 */

import { CUES, type SfxKind } from "@/video/timeline";
import { FPS } from "@/video/frame";

type Ctx = AudioContext & { blinkBus?: GainNode };

/** One voice: an oscillator through its own envelope. */
function tone(
  ctx: Ctx,
  bus: GainNode,
  at: number,
  opts: {
    type: OscillatorType;
    from: number;
    to?: number;
    gain: number;
    attack?: number;
    decay: number;
  },
) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  const attack = opts.attack ?? 0.004;

  osc.type = opts.type;
  osc.frequency.setValueAtTime(opts.from, at);
  if (opts.to !== undefined) {
    // Exponential: pitch is heard logarithmically, so a linear sweep sounds
    // like it slows down at the end even when it does not.
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), at + opts.decay);
  }

  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(Math.max(0.0001, opts.gain), at + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, at + opts.decay);

  osc.connect(env).connect(bus);
  osc.start(at);
  osc.stop(at + opts.decay + 0.02);
}

/** Filtered noise — the air in a whip, the grit in a scan. */
function noise(
  ctx: Ctx,
  bus: GainNode,
  at: number,
  opts: { gain: number; decay: number; from: number; to: number; q?: number },
) {
  const frames = Math.max(1, Math.floor(ctx.sampleRate * opts.decay));
  const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buf;

  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = opts.q ?? 1.1;
  band.frequency.setValueAtTime(opts.from, at);
  band.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), at + opts.decay);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(Math.max(0.0001, opts.gain), at + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, at + opts.decay);

  src.connect(band).connect(env).connect(bus);
  src.start(at);
  src.stop(at + opts.decay + 0.02);
}

/**
 * The eight kinds.
 *
 * Each is a sentence about what just happened on screen, which is why they are
 * separate at all: an impact is a word arriving, a whip is a word leaving, a
 * tick is one thing being counted. Same synth, different grammar.
 */
const VOICES: Record<SfxKind, (ctx: Ctx, bus: GainNode, at: number, g: number) => void> = {
  /* A word arrives: low body under a short click, so it reads as weight. */
  impact: (ctx, bus, at, g) => {
    tone(ctx, bus, at, { type: "sine", from: 180, to: 52, gain: 0.5 * g, decay: 0.28 });
    tone(ctx, bus, at, { type: "triangle", from: 900, to: 320, gain: 0.16 * g, decay: 0.07 });
  },

  /* A word leaves sideways. Air, moving. */
  whip: (ctx, bus, at, g) => {
    noise(ctx, bus, at, { gain: 0.16 * g, decay: 0.19, from: 900, to: 5200, q: 0.9 });
  },

  /* One thing counted. Deliberately tiny — nine of these fire in a row. */
  tick: (ctx, bus, at, g) => {
    tone(ctx, bus, at, { type: "square", from: 2100, to: 1500, gain: 0.05 * g, decay: 0.035 });
  },

  /* Something appears, lightly. */
  pop: (ctx, bus, at, g) => {
    tone(ctx, bus, at, { type: "sine", from: 420, to: 780, gain: 0.24 * g, decay: 0.12 });
  },

  /* The reticle sweeping. The one sustained sound in the film. */
  scan: (ctx, bus, at, g) => {
    noise(ctx, bus, at, { gain: 0.055 * g, decay: 1.5, from: 380, to: 2600, q: 3.2 });
  },

  /* A measurement completes: a rising two-note figure, not a chime. */
  confirm: (ctx, bus, at, g) => {
    tone(ctx, bus, at, { type: "sine", from: 620, gain: 0.16 * g, decay: 0.16 });
    tone(ctx, bus, at + 0.075, { type: "sine", from: 930, gain: 0.14 * g, decay: 0.3 });
  },

  /* Felt more than heard. Carries the cuts the picture makes silently. */
  sub: (ctx, bus, at, g) => {
    tone(ctx, bus, at, { type: "sine", from: 96, to: 40, gain: 0.5 * g, attack: 0.02, decay: 0.5 });
  },

  /* The ring starting to draw. Air with a pitch in it. */
  shimmer: (ctx, bus, at, g) => {
    noise(ctx, bus, at, { gain: 0.05 * g, decay: 0.55, from: 2400, to: 5600, q: 2.4 });
    tone(ctx, bus, at, { type: "sine", from: 1560, gain: 0.05 * g, decay: 0.5 });
  },
};

export class Sfx {
  private ctx: Ctx | null = null;
  private bus: GainNode | null = null;
  /** Index of the next cue that has not been fired. */
  private cursor = 0;

  /** Built on the gesture that unmutes, never before. */
  private ensure(): Ctx | null {
    if (this.ctx) return this.ctx;
    const Ctor =
      typeof window !== "undefined"
        ? window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        : undefined;
    if (!Ctor) return null;

    const ctx = new Ctor() as Ctx;
    const bus = ctx.createGain();
    // Headroom: nine ticks and an impact can overlap, and clipping on a
    // landing page sounds like a bug rather than a mix.
    bus.gain.value = 0.55;
    bus.connect(ctx.destination);
    this.ctx = ctx;
    this.bus = bus;
    return ctx;
  }

  async resume() {
    const ctx = this.ensure();
    if (ctx && ctx.state === "suspended") await ctx.resume();
  }

  /** Seeking, or looping back to the top. */
  seek(frame: number) {
    this.cursor = CUES.findIndex((c) => c.frame >= frame);
    if (this.cursor < 0) this.cursor = CUES.length;
  }

  /**
   * Fire every cue at or before `to` that has not fired yet.
   *
   * A cue inside the window is already in the past — the picture for that
   * frame has been shown — so it plays now rather than being scheduled. When a
   * dropped frame puts two cues in one window they are spaced by their
   * authored gap instead of stacking into a chord, which is the difference
   * between a stutter and a click.
   */
  playUpTo(to: number) {
    const ctx = this.ctx;
    const bus = this.bus;
    if (!ctx || !bus || ctx.state !== "running") return;

    const head = this.cursor;
    while (this.cursor < CUES.length && CUES[this.cursor].frame <= to) {
      const cue = CUES[this.cursor];
      const offset = head === this.cursor ? 0 : (cue.frame - CUES[head].frame) / FPS;
      VOICES[cue.kind](ctx, bus, ctx.currentTime + offset + 0.001, cue.gain ?? 0.6);
      this.cursor += 1;
    }
  }

  close() {
    void this.ctx?.close();
    this.ctx = null;
    this.bus = null;
  }
}
