#!/usr/bin/env python3
"""Procedurally generates the v3 launch-video music bed (27s, launch arc).

Copyright-free by construction: every sound is synthesized from scratch
with numpy (no samples). Deterministic — same parameters, same output.

Arc (aligned to storyboard v3 scene boundaries):
    0.0        audible intro bed from frame 0 (pad + pulse + hats), hit at 0
    0.6-2.2    typing SFX under the hook setup lines
    2.6-4.0    riser into the title-card drop
    4.0        drop: crash + full groove starts (title card)
    5.8-9.4    typing SFX under the JSON demo
    17.0       609 landing: crash + sub drop accent
    19.5       proof grid: energy lift (open hats, lead up an octave)
    21.5-23.0  riser into the CTA
    23.0       final stinger on the CTA card; pad holds to the end
    26.5-27.0  audio fades out with the picture — no trailing silence

Output is loudness-normalized to about -14 LUFS / -1.5 dBTP via ffmpeg.

Usage:
    python3 scripts/generate-music-v3.py           # writes assets/music-v3.mp3
    python3 scripts/generate-music-v3.py out.mp3   # custom output path

Requires: numpy, ffmpeg.
"""
import json
import os
import subprocess
import sys
import tempfile
import wave

import numpy as np

SR = 48000
BPM = 120
BEAT = 60.0 / BPM   # 0.5 s
BAR = 4 * BEAT      # 2.0 s
DUR = 27.0

A = 220.0

# Scene boundaries (s) from storyboard.json v3.
CUTS = [4.0, 5.8, 10.3, 13.0, 15.5, 19.5, 23.0]
HIT_609 = 17.0
LIFT = 19.5
FINAL_HIT = 23.0
PUNCH_ACCENT = 2.33  # hook punchline snap-in


def note(semitones):
    return A * 2 ** (semitones / 12.0)


def env(n, attack, decay):
    t = np.arange(n) / SR
    e = np.exp(-t / decay)
    a = int(attack * SR)
    if a > 0:
        e[:a] *= np.linspace(0, 1, a)
    return e


def add(buf, start_s, sig, gain=1.0):
    i = int(start_s * SR)
    j = min(i + len(sig), len(buf))
    if j > i:
        buf[i:j] += sig[: j - i] * gain


def kick(dur=0.25):
    n = int(dur * SR)
    t = np.arange(n) / SR
    freq = 120 * np.exp(-t * 18) + 45
    return np.sin(2 * np.pi * np.cumsum(freq) / SR) * env(n, 0.002, 0.09) * 0.9


def snare(dur=0.2):
    rng = np.random.default_rng(7)
    n = int(dur * SR)
    noise = rng.standard_normal(n) * env(n, 0.001, 0.045)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * 190 * t) * env(n, 0.001, 0.06)
    return (0.55 * noise + 0.35 * body) * 0.8


def hihat(dur=0.06, open_=False):
    rng = np.random.default_rng(3)
    n = int((0.18 if open_ else dur) * SR)
    noise = rng.standard_normal(n)
    noise -= np.concatenate(([0.0], noise[:-1]))
    return noise * env(n, 0.001, 0.05 if open_ else 0.015) * 0.25


def bass(freq, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = np.sin(2 * np.pi * freq * t) + 0.4 * np.sign(np.sin(2 * np.pi * freq * t))
    return sig * env(n, 0.004, 0.22) * 0.32


def lead(freq, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    saw = 2 * ((freq * t) % 1.0) - 1
    saw2 = 2 * ((freq * 1.005 * t) % 1.0) - 1
    return (saw + saw2) * env(n, 0.008, 0.18) * 0.14


def chord(freqs, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = sum(np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t) for f in freqs)
    return sig * env(n, 0.02, 0.6) * 0.07


def pad(freqs, dur):
    """Sustained pad (slow attack, slow decay) for the intro bed and outro."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = sum(
        np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t + 0.5)
        for f in freqs
    )
    e = np.minimum(t / 0.06, 1.0) * np.exp(-t / (dur * 0.8))
    return sig * e * 0.06


def crash(dur=1.2):
    rng = np.random.default_rng(11)
    n = int(dur * SR)
    noise = rng.standard_normal(n)
    noise -= np.concatenate(([0.0], noise[:-1]))
    return noise * env(n, 0.001, 0.35) * 0.5


def sub_drop(freq=55.0, dur=0.9):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = freq * np.exp(-t * 1.5) + 35
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.003, 0.4) * 0.9


def whoosh(dur=0.35):
    rng = np.random.default_rng(5)
    n = int(dur * SR)
    noise = rng.standard_normal(n)
    shape = np.sin(np.linspace(0, np.pi, n)) ** 2
    lp = np.convolve(noise, np.ones(24) / 24, mode="same")
    return lp * shape * 0.4


def tick():
    rng = np.random.default_rng(13)
    n = int(0.02 * SR)
    noise = rng.standard_normal(n)
    noise -= np.concatenate(([0.0], noise[:-1]))
    return noise * env(n, 0.0005, 0.006) * 0.35


def riser(dur=1.5):
    rng = np.random.default_rng(17)
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    lp = np.convolve(noise, np.ones(12) / 12, mode="same")
    amp = (t / dur) ** 2.2 * 0.55
    sweep = np.sin(2 * np.pi * np.cumsum(180 + 900 * (t / dur) ** 2) / SR) * amp * 0.4
    return lp * amp + sweep


def build():
    left = np.zeros(int(DUR * SR) + SR, dtype=np.float64)
    right = np.zeros_like(left)

    prog = [[0, 3, 7], [-4, 0, 5], [3, 7, 12], [-2, 2, 7]]  # Am F C G
    bass_roots = [0, -4, 3, -2]
    melody = [
        [12, None, 15, None, 19, None, 15, 12],
        [8, None, 12, None, 17, None, 12, 8],
        [15, None, 19, None, 24, 19, 15, None],
        [10, None, 14, None, 19, None, 14, 10],
    ]

    n_bars = int(np.ceil(DUR / BAR))
    for bar in range(n_bars):
        t0 = bar * BAR
        if t0 >= FINAL_HIT:
            break  # outro handled explicitly below
        ch = prog[bar % 4]
        intro = t0 < 4.0            # hook: audible bed, no full kit
        groove = t0 >= 4.0          # drums+bass from the title drop
        full = t0 >= 5.8            # full kit + lead from demo on
        lifted = t0 >= LIFT         # proof-grid energy lift

        if groove:
            for b in range(4):
                bt = t0 + b * BEAT
                if bt >= FINAL_HIT - 0.01:
                    continue
                add(left, bt, kick()); add(right, bt, kick())
                if b in (1, 3):
                    s = snare()
                    add(left, bt, s * 0.9); add(right, bt, s * 1.1)
                if full:
                    for h in range(2):
                        ht = bt + h * BEAT / 2
                        hh = hihat(open_=(b == 3 and h == 1) or (lifted and h == 1))
                        g = 1.3 if lifted else 1.0
                        add(left, ht, hh * (1.15 if h else 0.85) * g)
                        add(right, ht, hh * (0.85 if h else 1.15) * g)
        else:
            # intro bed: soft kick pulse on 1 and 3, off-beat hats
            for b in range(4):
                bt = t0 + b * BEAT
                if b in (0, 2):
                    k = kick()
                    add(left, bt, k * 0.5); add(right, bt, k * 0.5)
                ht = bt + BEAT / 2
                hh = hihat()
                add(left, ht, hh * 0.7); add(right, ht, hh * 0.7)

        # Bass: light root pulse in the intro, driving line in the groove
        root = note(bass_roots[bar % 4] - 12)
        if intro:
            for b in (0, 2):
                bt = t0 + b * BEAT
                bs = bass(root, BEAT * 0.9)
                add(left, bt, bs * 0.55); add(right, bt, bs * 0.55)
        else:
            for e8 in range(8):
                et = t0 + e8 * BEAT / 2
                if et >= FINAL_HIT - 0.01:
                    continue
                f = root * (2 if e8 in (3, 7) else 1)
                b = bass(f, BEAT / 2 * 0.95)
                add(left, et, b); add(right, et, b)

        # Chord bed always — this makes frame 0 audible
        if intro:
            p = pad([note(s) for s in ch], BAR * 1.1)
            add(left, t0, p * 1.35); add(right, t0, p * 1.15)
        c = chord([note(s) for s in ch], BAR)
        g = 1.5 if intro else 1.0
        add(left, t0, c * 1.1 * g); add(right, t0, c * 0.9 * g)

        # Lead melody in full groove; up an octave during the proof lift
        if full:
            for e8, m in enumerate(melody[bar % 4]):
                if m is None:
                    continue
                et = t0 + e8 * BEAT / 2
                if et >= 21.5:  # drop lead during CTA riser
                    continue
                shift = 12 if lifted else 0
                l = lead(note(m + shift), BEAT / 2 * 0.9)
                g = 1.2 if lifted else 1.0
                add(left, et, l * 0.9 * g); add(right, et, l * 1.1 * g)

    # --- SFX layer -----------------------------------------------------
    # opening impact so frame 0 has energy
    add(left, 0.0, sub_drop(50, 0.7), 0.7); add(right, 0.0, sub_drop(50, 0.7), 0.7)

    for c in CUTS:  # soft whoosh on each scene cut
        w = whoosh()
        add(left, c - 0.18, w, 0.85); add(right, c - 0.18, w, 0.85)

    # typing SFX: hook setup lines, JSON demo, CTA command (audible, ~-18 dBFS)
    rng = np.random.default_rng(23)
    for t in np.arange(0.6, 2.2, 0.10):
        tk = tick()
        g = 1.6 + 0.8 * rng.random()
        add(left, t + rng.random() * 0.03, tk, g)
        add(right, t + rng.random() * 0.03, tk, g)
    for t in np.arange(6.0, 9.4, 0.11):
        tk = tick()
        g = 1.6 + 0.8 * rng.random()
        add(left, t + rng.random() * 0.03, tk, g)
        add(right, t + rng.random() * 0.03, tk, g)
    for t in np.arange(23.3, 24.0, 0.07):
        tk = tick()
        g = 1.4 + 0.7 * rng.random()
        add(left, t + rng.random() * 0.02, tk, g)
        add(right, t + rng.random() * 0.02, tk, g)

    # hook punchline snap-in accent
    add(left, PUNCH_ACCENT, snare(), 0.9); add(right, PUNCH_ACCENT, snare(), 0.9)
    add(left, PUNCH_ACCENT, sub_drop(58, 0.5), 0.6); add(right, PUNCH_ACCENT, sub_drop(58, 0.5), 0.6)

    # riser into the 4.0s title drop, then the drop itself
    r0 = riser(1.4)
    add(left, 2.6, r0, 0.8); add(right, 2.6, r0, 1.0)
    add(left, 4.0, crash(), 0.9); add(right, 4.0, crash(), 0.9)
    add(left, 4.0, sub_drop(), 0.9); add(right, 4.0, sub_drop(), 0.9)

    # 609 landing: crash + sub drop
    add(left, HIT_609, crash(), 0.9); add(right, HIT_609, crash(), 0.9)
    add(left, HIT_609, sub_drop(), 1.0); add(right, HIT_609, sub_drop(), 1.0)

    # proof-grid lift: crash marks the section change
    add(left, LIFT, crash(), 0.7); add(right, LIFT, crash(), 0.7)

    # CTA riser into final stinger
    r = riser(FINAL_HIT - 21.5)
    add(left, 21.5, r, 0.9); add(right, 21.5, r, 1.1)
    add(left, FINAL_HIT, crash(2.2), 1.1); add(right, FINAL_HIT, crash(2.2), 1.1)
    add(left, FINAL_HIT, sub_drop(60, 1.8), 1.2); add(right, FINAL_HIT, sub_drop(60, 1.8), 1.2)
    # resolving chord that holds under the CTA card to the end (no dead air)
    fc = chord([note(s) for s in [0, 3, 7, 12]], DUR - FINAL_HIT)
    add(left, FINAL_HIT, fc, 2.2); add(right, FINAL_HIT, fc, 2.2)
    op = pad([note(s) for s in [0, 3, 7, 12]], DUR - FINAL_HIT)
    add(left, FINAL_HIT, op, 2.6); add(right, FINAL_HIT, op, 2.4)
    # soft heartbeat pulses keep the outro alive
    for bt in (24.0, 25.0, 26.0):
        k = kick()
        add(left, bt, k * 0.35); add(right, bt, k * 0.35)

    # --- master --------------------------------------------------------
    n = int(DUR * SR)
    stereo = np.stack([left[:n], right[:n]], axis=1)
    stereo /= np.max(np.abs(stereo)) * 1.12
    # soft saturation reduces the crest factor so mastering can reach -14 LUFS
    stereo = np.tanh(stereo * 2.5) / np.tanh(2.5)
    stereo /= np.max(np.abs(stereo)) * 1.12
    # 20ms anti-click ramp in; fade with the picture over the last 0.5s only
    fi = int(0.02 * SR)
    stereo[:fi] *= np.linspace(0, 1, fi)[:, None]
    fo = int(0.5 * SR)
    stereo[-fo:] *= np.linspace(1, 0, fo)[:, None]
    return (stereo * 32767).astype(np.int16)


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "music-v3.mp3"
    )
    os.makedirs(os.path.dirname(out), exist_ok=True)
    pcm = build()
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        wav_path = f.name
    try:
        with wave.open(wav_path, "wb") as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())
        # Measured straight gain + brickwall limiter lands -14 LUFS
        # integrated with a ~-1.5 dB ceiling (headroom for mp3 encoder
        # overshoot); the tanh saturation in build() already tamed the crest.
        probe = subprocess.run(
            ["ffmpeg", "-i", wav_path, "-af", "ebur128",
             "-f", "null", "-"],
            check=True, capture_output=True, text=True,
        )
        measured = float(
            [l for l in probe.stderr.splitlines() if "I:" in l][-1].split("I:")[1].split("LUFS")[0]
        )
        gain = -14.0 - measured
        # The limiter eats some loudness; iterate the gain until the encoded
        # output actually integrates to -14 LUFS (within 0.2 LU).
        for _ in range(4):
            master = f"volume={gain:.2f}dB,alimiter=limit=0.631:attack=2:release=60:level=false"
            subprocess.run(
                ["ffmpeg", "-y", "-i", wav_path, "-af", master,
                 "-c:a", "libmp3lame", "-b:a", "192k", "-ar", "48000", "-ac", "2", out],
                check=True, capture_output=True,
            )
            check = subprocess.run(
                ["ffmpeg", "-i", out, "-af", "ebur128", "-f", "null", "-"],
                check=True, capture_output=True, text=True,
            )
            got = float(
                [l for l in check.stderr.splitlines() if "I:" in l][-1].split("I:")[1].split("LUFS")[0]
            )
            if abs(got + 14.0) <= 0.2:
                break
            gain += (-14.0 - got)
    finally:
        os.unlink(wav_path)
    print(f"Wrote {out} ({os.path.getsize(out)} bytes, {DUR:.1f}s @ {BPM} BPM)")


if __name__ == "__main__":
    main()
