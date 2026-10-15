"""Generate once; static clips require no speech engine at playback time."""
import argparse
import json
import os
import re
from pathlib import Path
import shutil
import subprocess
import tempfile

os.environ.setdefault("OMP_NUM_THREADS", "4")

import numpy as np
import soundfile as sf
import onnxruntime as ort
from kokoro_onnx import Kokoro


VOICES = {"P": "bm_george", "D": "bm_lewis", "L": "bf_emma", "Ps": "bf_isabella"}
# Ordered so any prefix stays balanced; --group-size picks the first N.
GROUP = [
    ("bm_george", 0.985, 0.0, -0.6),
    ("bf_emma", 1.00, 0.04, 0.55),
    ("am_michael", 1.015, 0.07, 0.25),
    ("af_sarah", 0.995, 0.055, -0.2),
    ("bm_lewis", 1.02, 0.035, 0.8),
    ("bf_isabella", 0.99, 0.095, -0.8),
]
DEFAULT_GROUP_SIZE = 4
# English-voice pronunciation of Greek liturgical words, given as phonemes because
# espeak reads Kyrie as KY-ree and Christe as Christ. Captions and manifest keys stay unchanged.
PHONEMES = {
    "Kyrie, eleison.": "kˈɪəɹieɪ, eɪlˈeɪɪsɒn.",
    "Christe, eleison.": "kɹˈɪsteɪ, eɪlˈeɪɪsɒn.",
}


def spoken_form(text, language):
    """Return (input, is_phonemes) for the engine; captions are never changed."""
    if language == "en" and text in PHONEMES:
        return PHONEMES[text], True
    if language == "en":
        # Capitalised rubric text (the words of consecration) would be spelled out: IT -> I.T.
        text = re.sub(r"\b[A-Z]{2,}\b", lambda match: match.group(0).lower(), text)
    return text, False

class ModelInputSession:
    """Normalize exported input types; kokoro-onnx 0.4.9 mis-types speed."""

    def __init__(self, session):
        self.session = session
        self.inputs = session.get_inputs()

    def get_inputs(self):
        return self.inputs

    def run(self, names, values):
        dtypes = {"tensor(float)": np.float32, "tensor(int64)": np.int64}
        converted = {
            item.name: np.asarray(values[item.name], dtype=dtypes[item.type])
            for item in self.inputs
        }
        return self.session.run(names, converted)


def mix_group(layers, sample_rate):
    length = max(len(samples) + round(delay * sample_rate) for samples, delay, _ in layers)
    mixed = np.zeros((length + round(sample_rate * 0.25), 2), dtype=np.float32)
    for samples, delay, pan in layers:
        start = round(delay * sample_rate)
        gains = np.sqrt([(1 - pan) / 2, (1 + pan) / 2]) / len(layers)
        signal = samples[:, None] * gains
        mixed[start:start + len(samples)] += signal
        for echo_delay, gain in [(0.11, 0.1), (0.19, 0.05)]:
            echo = start + round(echo_delay * sample_rate)
            mixed[echo:echo + len(samples)] += signal * gain
    peak = float(np.max(np.abs(mixed)))
    if peak <= 0 or not np.isfinite(peak):
        raise ValueError("Invalid or silent congregation mix")
    return mixed * (0.86 / peak)

def vary_speed(samples, speed):
    return np.interp(
        np.arange(0, len(samples), speed), np.arange(len(samples)), samples
    ).astype(np.float32)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True)
    parser.add_argument("--voices", required=True)
    parser.add_argument("--jobs", required=True)
    parser.add_argument("--output", default="audio")
    parser.add_argument("--experimental-latin", action="store_true",
                        help="Use Latin phonemes with English-trained voices; pronunciation needs review.")
    parser.add_argument("--group-size", type=int, default=DEFAULT_GROUP_SIZE,
                        choices=range(2, len(GROUP) + 1),
                        help="Number of layered voices in congregation clips.")
    args = parser.parse_args()
    group = GROUP[:args.group_size]
    if not shutil.which("ffmpeg"):
        raise RuntimeError("FFmpeg is required to encode static MP3 files")
    engine = Kokoro(args.model, args.voices)
    session_options = ort.SessionOptions()
    session_options.intra_op_num_threads = 4
    session_options.inter_op_num_threads = 1
    engine.sess = ModelInputSession(ort.InferenceSession(
        args.model, sess_options=session_options, providers=["CPUExecutionProvider"]
    ))
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    jobs = json.loads(Path(args.jobs).read_text(encoding="utf-8"))
    clips = {}
    languages = set()
    for index, job in enumerate(jobs):
        language, role, text = job["language"], job["role"], job["text"]
        if language == "la" and not args.experimental_latin:
            continue
        key = json.dumps([language, role, text], ensure_ascii=False, separators=(",", ":"))
        destination = Path(job["file"])
        if args.output != "audio":
            destination = output / destination.relative_to("audio")
        destination.parent.mkdir(parents=True, exist_ok=True)
        filename = destination.name
        if not destination.exists():
            phoneme_language = "la" if language == "la" else "en-gb"
            spoken, is_phonemes = spoken_form(text, language)
            if role == "ppl":
                layers = []
                for voice, speed, delay, pan in group:
                    samples, rate = engine.create(spoken, voice=voice, speed=1, lang=phoneme_language, is_phonemes=is_phonemes)
                    samples = vary_speed(samples, speed)
                    layers.append((samples, delay, pan))
                samples = mix_group(layers, rate)
            else:
                samples, rate = engine.create(spoken, voice=VOICES[role], speed=1, lang=phoneme_language, is_phonemes=is_phonemes)
                samples = vary_speed(samples, 0.95)
            if not len(samples) or not np.isfinite(samples).all():
                raise ValueError(f"Invalid generated audio for {key}")
            with tempfile.TemporaryDirectory() as temporary:
                wav = Path(temporary) / "clip.wav"
                sf.write(wav, samples, rate, subtype="PCM_16")
                pending = destination.with_name(filename + ".pending.mp3")
                # Prayers said quietly or in a low voice get a softer, hushed tone.
                hush = ["-af", "highpass=f=220,lowpass=f=3400,volume=0.5"] if job.get("quiet") else []
                subprocess.run(
                    ["ffmpeg", "-v", "error", "-y", "-i", str(wav), *hush, "-codec:a", "libmp3lame",
                     "-b:a", "96k", str(pending)], check=True
                )
                pending.replace(destination)
        if destination.stat().st_size < 500:
            raise ValueError(f"Incomplete clip: {destination}")
        clips[key] = job["file"]
        languages.add(language)
        print(f"{index + 1}/{len(jobs)} {language} {role}: {text[:55]}", flush=True)
    manifest = {
        "version": 1, "engine": "Kokoro-82M v1.0 (int8 ONNX)",
        "voices": VOICES, "groupVoices": [voice for voice, *_ in group],
        "languages": sorted(languages),
        "latinExperimental": args.experimental_latin and "la" in languages,
        "plannedClips": len(jobs),
        "clips": clips,
    }
    encoded = json.dumps(manifest, ensure_ascii=False, indent=2)
    (output / "audio-manifest.json").write_text(encoded, encoding="utf-8")
    (output / "audio-manifest.js").write_text("window.MASS_STATIC_AUDIO = " + encoded + ";\n", encoding="utf-8")
    print(f"Saved {len(clips)} clips and offline manifest in {output}", flush=True)


if __name__ == "__main__":
    main()
