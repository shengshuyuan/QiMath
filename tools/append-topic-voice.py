#!/usr/bin/env python3
"""为专题课高频固定题面追加婷婷录音，合并进 js/voice-clips.js（不重录旧句）。

用法：python3 tools/append-topic-voice.py
需要：say -v Tingting、ffmpeg。
"""

import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO_DIR = ROOT / "audio" / "piper"
CLIPS_JS = ROOT / "js" / "voice-clips.js"
TMP = Path("/tmp/tingting-topic-voice")

# 练习「听题目」会原样朗读的固定题干；录这些就能命中真人语音。
TOPIC_PHRASES = [
    "看钟面，现在是几时几分？",
    "看直尺，物体长多少厘米？",
    "看图，这是什么角？",
    "比较下面两个角，上面的角和下面的角哪个更大？",
    "一个角有几个顶点？",
    "一个角有几条边？",
    "看电子秤，物品的质量是多少克？",
    "看电子秤，物品的质量是多少千克？",
    "看图，这张（枚）人民币的面值是多少？",
    "看图，一共有多少钱？",
    "把角的两条边画长一些，开口不变，角会变大吗？",
    "把一个角整体转一转，角的大小会改变吗？",
    "把角的两条边张开得更大，角会怎样？",
    "先选出第一步计算的部分。",
    "顺序选对了！算一算这部分。",
    "中间结果正确！继续算最后一步。",
    "先填入一个整数答案。",
    "认识混合运算",
    "认识长度单位",
    "认识角",
    "认识时间",
    "认识克和千克",
    "认识人民币",
]


def load_existing():
    text = CLIPS_JS.read_text(encoding="utf-8")
    match = re.search(r"MT\.voiceClips = (\{.*?\});\s*\n\}\)\(window", text, re.S)
    if not match:
        raise RuntimeError("cannot parse voice-clips.js")
    return json.loads(match.group(1)), text


def next_name(used):
    index = 0
    while True:
        name = "%03d.mp3" % index
        if name not in used:
            return name
        index += 1


def record(text, dest):
    TMP.mkdir(parents=True, exist_ok=True)
    aiff = TMP / (dest.stem + ".aiff")
    subprocess.run(["say", "-v", "Tingting", "-o", str(aiff), text], check=True)
    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", str(aiff),
            "-codec:a", "libmp3lame", "-b:a", "64k",
            "-ac", "1", "-ar", "22050",
            str(dest),
        ],
        check=True,
    )
    aiff.unlink(missing_ok=True)


def main():
    mapping, _ = load_existing()
    used = {Path(rel).name for rel in mapping.values()}
    added = 0
    for text in TOPIC_PHRASES:
        if text in mapping:
            rel = mapping[text]
            path = ROOT / rel
            if path.is_file() and path.stat().st_size > 0:
                continue
        name = next_name(used)
        used.add(name)
        rel = "audio/piper/" + name
        dest = AUDIO_DIR / name
        print("record", text, "->", rel)
        record(text, dest)
        mapping[text] = rel
        added += 1

    body = json.dumps(mapping, ensure_ascii=False, indent=2)
    CLIPS_JS.write_text(
        "(function (MT) {\n"
        "  'use strict';\n"
        "  // macOS 婷婷普通话。键是 speech.js 会说的原句。\n"
        "  MT.voiceClips = %s;\n"
        "})(window.MT = window.MT || {});\n" % body,
        encoding="utf-8",
    )
    print("appended %d topic clips; total %d" % (added, len(mapping)))


if __name__ == "__main__":
    main()
