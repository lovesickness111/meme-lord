#!/usr/bin/env python3
"""Procedurally generates the launch-video background music.

Copyright-free by construction: every sound is synthesized from scratch
with numpy (no samples). Deterministic — same parameters, same output.

Usage:
    python3 scripts/generate-music.py            # writes assets/music.mp3
    python3 scripts/generate-music.py out.mp3    # custom output path

Requires: numpy, ffmpeg (for the MP3 encode).
"""
import os
import subprocess
import sys
import tempfile
import wave

import numpy as np

SR = 48000          # sample rate
BPM = 120
BEAT = 60.0 / BPM   # 0.5 s per beat
BAR = 4 * BEAT      # 2.0 s per bar (4/4)
BARS = 10           # 20.0 s total -> loops cleanly on the bar grid
DUR = BARS * BAR

A = 220.0


def note(semitones):
    """Frequency of a note relative to A3 (220 Hz)."""
    return A * 2 ** (semitones / 12.0)


def env(n, attack, decay):
    """Simple attack/exponential-decay envelope of n samples."""
    t = np.arange(n) / SR
    e = np.exp(-t / decay)
    a = int(attack * SR)
    if a > 0:
        e[:a] *= np.linspace(0, 1, a)
    return e


def add(buf, start_s, sig):
    i = int(start_s * SR)
    j = min(i + len(sig), len(buf))
    if j > i:
        buf[i:j] += sig[: j - i]


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
    noise -= np.concatenate(([0.0], noise[:-1]))  # crude high-pass
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
    saw2 = 2 * ((freq * 1.005 * t) % 1.0) - 1  # slight detune for width
    return (saw + saw2) * env(n, 0.008, 0.18) * 0.14


def chord(freqs, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = sum(np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t) for f in freqs)
    return sig * env(n, 0.02, 0.6) * 0.07


def build():
    left = np.zeros(int(DUR * SR) + SR, dtype=np.float64)
    right = np.zeros_like(left)

    # Chord progression (A minor, upbeat): Am - F - C - G, semitones from A3.
    prog = [
        [0, 3, 7],      # Am
        [-4, 0, 5],     # F
        [3, 7, 12],     # C
        [-2, 2, 7],     # G
    ]
    bass_roots = [0, -4, 3, -2]
    # Lead melody: one note per 8th, per bar (semitones from A4 = +12).
    melody = [
        [12, None, 15, None, 19, None, 15, 12],
        [8, None, 12, None, 17, None, 12, 8],
        [15, None, 19, None, 24, 19, 15, None],
        [10, None, 14, None, 19, None, 14, 10],
    ]

    for bar in range(BARS):
        t0 = bar * BAR
        ch = prog[bar % 4]

        # Drums
        for b in range(4):
            bt = t0 + b * BEAT
            add(left, bt, kick()); add(right, bt, kick())
            if b in (1, 3):
                s = snare()
                add(left, bt, s * 0.9); add(right, bt, s * 1.1)
            for h in range(2):
                ht = bt + h * BEAT / 2
                hh = hihat(open_=(b == 3 and h == 1))
                add(left, ht, hh * (1.15 if h else 0.85))
                add(right, ht, hh * (0.85 if h else 1.15))

        # Bassline: root 8ths with octave pops
        root = note(bass_roots[bar % 4] - 12)
        for e8 in range(8):
            f = root * (2 if e8 in (3, 7) else 1)
            b = bass(f, BEAT / 2 * 0.95)
            add(left, t0 + e8 * BEAT / 2, b)
            add(right, t0 + e8 * BEAT / 2, b)

        # Chord pad, once per bar
        c = chord([note(s) for s in ch], BAR)
        add(left, t0, c * 1.1); add(right, t0, c * 0.9)

        # Lead melody (skip first bar for a small build-up)
        if bar >= 1:
            for e8, m in enumerate(melody[bar % 4]):
                if m is None:
                    continue
                l = lead(note(m), BEAT / 2 * 0.9)
                add(left, t0 + e8 * BEAT / 2, l * 0.9)
                add(right, t0 + e8 * BEAT / 2, l * 1.1)

    # Trim to exact loop length, normalize, gentle fade at very edges
    n = int(DUR * SR)
    stereo = np.stack([left[:n], right[:n]], axis=1)
    stereo /= np.max(np.abs(stereo)) * 1.12
    fade = int(0.01 * SR)
    ramp = np.linspace(0, 1, fade)[:, None]
    stereo[:fade] *= ramp
    stereo[-fade:] *= ramp[::-1]
    return (stereo * 32767).astype(np.int16)


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "music.mp3"
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
        subprocess.run(
            ["ffmpeg", "-y", "-i", wav_path, "-c:a", "libmp3lame",
             "-b:a", "128k", "-ar", "48000", "-ac", "2", out],
            check=True, capture_output=True,
        )
    finally:
        os.unlink(wav_path)
    print(f"Wrote {out} ({os.path.getsize(out)} bytes, {DUR:.1f}s @ {BPM} BPM)")


if __name__ == "__main__":
    main()
