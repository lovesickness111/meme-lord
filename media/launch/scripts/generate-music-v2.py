#!/usr/bin/env python3
"""Procedurally generates the v2 launch-video music bed (28s, launch arc).

Copyright-free by construction: every sound is synthesized from scratch
with numpy (no samples). Deterministic — same parameters, same output.

Arc (aligned to storyboard v2 scene boundaries):
    0.0-3.0   hook       sparse pad + hats (intro)
    3.0-5.5   reveal     kick+bass enter (step-up), whoosh at 3.0
    5.5-16.0  demo/feat  full groove with lead; keyboard ticks 6-10s
    ~17.5     609 lands  accent hit + low-end swell
    19.0-22.5 proof      groove + card-landing pops
    22.5-26.0 cta        riser into a final hit at 26.0
    26.0-28.0 ending     hit decays to full silence

Output is loudness-normalized to about -14 LUFS / -1.5 dBTP via ffmpeg.

Usage:
    python3 scripts/generate-music-v2.py           # writes assets/music-v2.mp3
    python3 scripts/generate-music-v2.py out.mp3   # custom output path

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
DUR = 28.0
BARS = int(DUR / BAR)  # 14

A = 220.0

# Scene boundaries (s) from storyboard.json v2.
CUTS = [3.0, 5.5, 10.5, 13.25, 16.0, 19.0, 22.5]
HIT_609 = 17.5
FINAL_HIT = 26.0


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
    # band-ish shaping: rising amplitude then fall
    shape = np.sin(np.linspace(0, np.pi, n)) ** 2
    lp = np.convolve(noise, np.ones(24) / 24, mode="same")
    return lp * shape * 0.4


def tick():
    rng = np.random.default_rng(13)
    n = int(0.02 * SR)
    noise = rng.standard_normal(n)
    noise -= np.concatenate(([0.0], noise[:-1]))
    return noise * env(n, 0.0005, 0.006) * 0.35


def pop(freq=520.0):
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    f = freq * np.exp(-t * 20) + freq * 0.5
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.03) * 0.5


def riser(dur=3.0):
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

    for bar in range(BARS):
        t0 = bar * BAR
        ch = prog[bar % 4]
        intro = t0 < 3.0            # hook: sparse
        ending = t0 >= FINAL_HIT    # after final hit: silence (tail handled below)
        if ending:
            continue
        full = t0 >= 5.5            # full groove from demo scene on

        # Drums: none in intro, kick+snare from reveal, full kit in groove
        if not intro:
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
                        hh = hihat(open_=(b == 3 and h == 1))
                        add(left, ht, hh * (1.15 if h else 0.85))
                        add(right, ht, hh * (0.85 if h else 1.15))
        else:
            # intro: just off-beat hats
            for b in range(4):
                ht = t0 + b * BEAT + BEAT / 2
                hh = hihat()
                add(left, ht, hh * 0.6); add(right, ht, hh * 0.6)

        # Bass from reveal on
        if not intro:
            root = note(bass_roots[bar % 4] - 12)
            for e8 in range(8):
                et = t0 + e8 * BEAT / 2
                if et >= FINAL_HIT - 0.01:
                    continue
                f = root * (2 if e8 in (3, 7) else 1)
                b = bass(f, BEAT / 2 * 0.95)
                add(left, et, b); add(right, et, b)

        # Chord pad always (this is the intro's main content)
        c = chord([note(s) for s in ch], BAR)
        g = 1.4 if intro else 1.0
        add(left, t0, c * 1.1 * g); add(right, t0, c * 0.9 * g)

        # Lead melody only in full groove
        if full:
            for e8, m in enumerate(melody[bar % 4]):
                if m is None:
                    continue
                et = t0 + e8 * BEAT / 2
                if et >= 22.5:  # drop lead during CTA riser
                    continue
                l = lead(note(m), BEAT / 2 * 0.9)
                add(left, et, l * 0.9); add(right, et, l * 1.1)

    # --- SFX layer -----------------------------------------------------
    for c in CUTS:  # soft whoosh on each scene cut
        w = whoosh()
        add(left, c - 0.18, w, 0.8); add(right, c - 0.18, w, 0.8)

    # keyboard ticks under the JSON typing (6-9.5s) and CTA typing (22.8-24.3s)
    rng = np.random.default_rng(23)
    for t in np.arange(6.0, 9.5, 0.11):
        tk = tick()
        g = 0.5 + 0.3 * rng.random()
        add(left, t + rng.random() * 0.03, tk, g)
        add(right, t + rng.random() * 0.03, tk, g)
    for t in np.arange(22.8, 24.3, 0.09):
        tk = tick()
        g = 0.5 + 0.3 * rng.random()
        add(left, t + rng.random() * 0.02, tk, g)
        add(right, t + rng.random() * 0.02, tk, g)

    # pops on proof-grid card landings (6 cards, staggered from 19.1s)
    for i in range(6):
        p = pop(480 + 40 * i)
        add(left, 19.1 + i * 0.12, p, 0.7); add(right, 19.1 + i * 0.12, p, 0.7)

    # 609 landing: crash + sub drop
    add(left, HIT_609, crash(), 0.9); add(right, HIT_609, crash(), 0.9)
    add(left, HIT_609, sub_drop(), 1.0); add(right, HIT_609, sub_drop(), 1.0)

    # CTA riser into final hit
    r = riser(FINAL_HIT - 22.5)
    add(left, 22.5, r, 0.9); add(right, 22.5, r, 1.1)
    add(left, FINAL_HIT, crash(1.8), 1.0); add(right, FINAL_HIT, crash(1.8), 1.0)
    add(left, FINAL_HIT, sub_drop(60, 1.6), 1.1); add(right, FINAL_HIT, sub_drop(60, 1.6), 1.1)
    # resolving chord under the final hit, decaying to silence
    fc = chord([note(s) for s in [0, 3, 7, 12]], 2.0)
    add(left, FINAL_HIT, fc, 2.2); add(right, FINAL_HIT, fc, 2.2)

    # --- master --------------------------------------------------------
    n = int(DUR * SR)
    stereo = np.stack([left[:n], right[:n]], axis=1)
    stereo /= np.max(np.abs(stereo)) * 1.12
    # 1s fade-in, and a firm fade to true silence over the last 1.5s
    fi = int(1.0 * SR)
    stereo[:fi] *= np.linspace(0, 1, fi)[:, None]
    fo = int(1.5 * SR)
    stereo[-fo:] *= np.linspace(1, 0, fo)[:, None]
    return (stereo * 32767).astype(np.int16)


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "music-v2.mp3"
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
        # Two-pass loudness normalization to -14 LUFS / -1.5 dBTP for social.
        probe = subprocess.run(
            ["ffmpeg", "-i", wav_path, "-af", "loudnorm=I=-14:TP=-1.5:LRA=7:print_format=json",
             "-f", "null", "-"],
            check=True, capture_output=True, text=True,
        )
        stats = json.loads(probe.stderr[probe.stderr.rindex("{"):])
        ln = (f"loudnorm=I=-14:TP=-1.5:LRA=7:linear=true:"
              f"measured_I={stats['input_i']}:measured_TP={stats['input_tp']}:"
              f"measured_LRA={stats['input_lra']}:measured_thresh={stats['input_thresh']}:"
              f"offset={stats['target_offset']}")
        subprocess.run(
            ["ffmpeg", "-y", "-i", wav_path, "-af", ln,
             "-c:a", "libmp3lame", "-b:a", "192k", "-ar", "48000", "-ac", "2", out],
            check=True, capture_output=True,
        )
    finally:
        os.unlink(wav_path)
    print(f"Wrote {out} ({os.path.getsize(out)} bytes, {DUR:.1f}s @ {BPM} BPM)")


if __name__ == "__main__":
    main()
