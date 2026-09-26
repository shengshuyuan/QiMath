#!/usr/bin/env python3
"""Record the app's fixed lines with macOS 婷婷 and write audio/piper/*.mp3.

Double-clicking index.html plays these files. No model is shipped.
Requires the Tingting voice (say -v Tingting) and ffmpeg.
"""

import json
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO_DIR = ROOT / "audio" / "piper"
CLIPS_JS = ROOT / "js" / "voice-clips.js"
SW_JS = ROOT / "sw.js"
TMP = Path("/tmp/tingting-voice")

CN = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"]


def read_number(p):
    if p < 10:
        return CN[p]
    if p < 20:
        return "一十" if p % 10 == 0 else "十" + CN[p % 10]
    tens, ones = divmod(p, 10)
    return CN[tens] + "十" + (CN[ones] if ones else "")


def read_product(p):
    return ("得" + CN[p]) if p < 10 else read_number(p)


def phrases():
    lines = []
    for a in range(1, 10):
        for b in range(1, 10):
            lines.append(CN[a] + "、" + CN[b] + "、" + read_product(a * b))
            lines.append(CN[a] + "乘" + CN[b] + "，等于" + read_number(a * b))
            if a != b:
                lines.append(CN[a] + "乘" + CN[b] + "，同样等于" + read_number(a * b))
    lines.extend([
        "答对啦", "真棒", "太厉害了", "就是这样", "完全正确", "好厉害呀",
        "连对三题，厉害", "哇，一直答对", "越答越顺了", "手速好快",
        "再想想", "差一点点", "没关系，再来一次", "看看图再试试",
        "朗读打开啦",
    ])
    for n in range(1, 10):
        lines.append("第%d关通过" % n)
    seen = set()
    out = []
    for line in lines:
        if line not in seen:
            seen.add(line)
            out.append(line)
    return out


def record(job):
    text, out = job
    aiff = TMP / (out.stem + ".aiff")
    subprocess.run(
        ["say", "-v", "Tingting", "-o", str(aiff), text],
        check=True,
    )
    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", str(aiff),
            "-codec:a", "libmp3lame", "-b:a", "64k",
            "-ac", "1", "-ar", "22050",
            str(out),
        ],
        check=True,
    )
    aiff.unlink(missing_ok=True)
    return text, "audio/piper/" + out.name


def write_sw(names):
    text = SW_JS.read_text(encoding="utf-8")
    lines = []
    for line in text.splitlines(keepends=True):
        if "./audio/piper/" in line:
            continue
        lines.append(line)
    text = "".join(lines)
    block = "".join("  './audio/piper/%s',\n" % name for name in names)
    needle = "  './js/app.js'\n"
    if needle not in text:
        raise SystemExit("sw.js is missing the app.js asset line")
    text = text.replace(needle, block + needle, 1)
    if "mt99-cache-v" not in text:
        raise SystemExit("sw.js is missing CACHE_NAME")
    import re
    text = re.sub(r"mt99-cache-v\d+", "mt99-cache-v6", text, count=1)
    SW_JS.write_text(text, encoding="utf-8")


def main():
    TMP.mkdir(parents=True, exist_ok=True)
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    for old in AUDIO_DIR.glob("*.mp3"):
        old.unlink()

    jobs = []
    mapping_order = []
    for i, text in enumerate(phrases()):
        name = "%03d.mp3" % i
        jobs.append((text, AUDIO_DIR / name))
        mapping_order.append(text)

    mapping = {}
    with ThreadPoolExecutor(max_workers=4) as pool:
        for text, url in pool.map(record, jobs):
            mapping[text] = url
            print(url, text)

    ordered = {text: mapping[text] for text in mapping_order}
    body = json.dumps(ordered, ensure_ascii=False, indent=2)
    CLIPS_JS.write_text(
        "(function (MT) {\n"
        "  'use strict';\n"
        "  // macOS 婷婷普通话。键是 speech.js 会说的原句。\n"
        "  MT.voiceClips = %s;\n"
        "})(window.MT = window.MT || {});\n" % body,
        encoding="utf-8",
    )
    write_sw(["%03d.mp3" % i for i in range(len(mapping_order))])
    print("clips", len(mapping_order))


if __name__ == "__main__":
    main()
