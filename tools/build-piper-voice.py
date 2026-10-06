#!/usr/bin/env python3
"""Record the app's fixed lines with macOS 婷婷 and write audio/piper/*.mp3.

Double-clicking index.html plays these files. No model is shipped.
Requires the Tingting voice (say -v Tingting) and ffmpeg.
"""

import json
import re
import shutil
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO_DIR = ROOT / "audio" / "piper"
CLIPS_JS = ROOT / "js" / "voice-clips.js"
SW_JS = ROOT / "sw.js"
TMP = Path("/tmp/tingting-voice")
STAGE_DIR = TMP / "stage"

CN = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"]


def read_number(p):
    if p < 10:
        return CN[p]
    if p < 20:
        return "一十" if p % 10 == 0 else "十" + CN[p % 10]
    tens, ones = divmod(p, 10)
    return CN[tens] + "十" + (CN[ones] if ones else "")


def read_plain(p):
    if p == 10:
        return "十"
    return read_number(p)


def read_product(p):
    return ("得" + CN[p]) if p < 10 else read_number(p)


def phrases():
    lines = []
    # 1. 乘法口诀、算式朗读与对调朗读 (234 条)
    for a in range(1, 10):
        for b in range(1, 10):
            lines.append(CN[a] + "、" + CN[b] + "、" + read_product(a * b))
            lines.append(CN[a] + "乘" + CN[b] + "，等于" + read_number(a * b))
            if a != b:
                lines.append(CN[a] + "乘" + CN[b] + "，同样等于" + read_number(a * b))

    # 2. 互动反馈语 (15 条)
    lines.extend([
        "答对啦", "真棒", "太厉害了", "就是这样", "完全正确", "好厉害呀",
        "连对三题，厉害", "哇，一直答对", "越答越顺了", "手速好快",
        "再想想", "差一点点", "没关系，再来一次", "看看图再试试",
        "朗读打开啦",
    ])

    # 3. 关卡通过朗读 (9 条)
    for n in range(1, 10):
        lines.append("第%d关通过" % n)

    # 4. 表内除法完整算式朗读 (153 条)
    for a in range(1, 10):
        for b in range(a, 10):
            n = a * b
            if a == b:
                lines.append(read_number(n) + "除以" + CN[a] + "，等于" + read_number(a))
            else:
                lines.append(read_number(n) + "除以" + CN[a] + "，等于" + read_number(b))
                lines.append(read_number(n) + "除以" + CN[b] + "，等于" + read_number(a))
                lines.append(read_number(n) + "除以" + CN[a] + "，同样等于" + read_number(b))
                lines.append(read_number(n) + "除以" + CN[b] + "，同样等于" + read_number(a))

    # 5. 表内除法口诀朗读 (81 条)
    for d in range(1, 10):
        for q in range(1, 10):
            lines.append(read_number(d * q) + "、除以、" + CN[d] + "、得" + CN[q])

    # 6. 20 以内加法、减法完整算式。先加后减，两种顺序都保留。
    for a in range(0, 21):
        for b in range(0, 21 - a):
            lines.append(read_plain(a) + "加" + read_plain(b) + "等于" + read_plain(a + b))
    for m in range(0, 21):
        for s in range(0, m + 1):
            lines.append(read_plain(m) + "减" + read_plain(s) + "等于" + read_plain(m - s))

    seen = set()
    out = []
    for line in lines:
        if line not in seen:
            seen.add(line)
            out.append(line)
    return out


def record(job):
    text, out = job
    if out.is_file() and out.stat().st_size > 0:
        return text, "audio/piper/" + out.name

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


def bump_sw_cache():
    if not SW_JS.is_file():
        return
    text = SW_JS.read_text(encoding="utf-8")
    m = re.search(r"mt99-cache-v(\d+)", text)
    if m:
        cur_v = int(m.group(1))
        new_text = re.sub(r"mt99-cache-v\d+", "mt99-cache-v%d" % (cur_v + 1), text, count=1)
        SW_JS.write_text(new_text, encoding="utf-8")


def load_existing():
    if not CLIPS_JS.is_file():
        return {}
    text = CLIPS_JS.read_text(encoding="utf-8")
    match = re.search(r"MT\.voiceClips = (\{.*?\});\s*\n\}\)\(window", text, re.S)
    if not match:
        return {}
    data = json.loads(match.group(1))
    kept = {}
    for line, rel in data.items():
        path = ROOT / rel
        if path.is_file() and path.stat().st_size > 0:
            kept[line] = rel
    return kept


def main():
    TMP.mkdir(parents=True, exist_ok=True)
    STAGE_DIR.mkdir(parents=True, exist_ok=True)
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    all_phrases = phrases()
    existing = load_existing()
    used_names = {Path(rel).name for rel in existing.values()}
    jobs = []
    mapping_order = []
    next_index = 0

    def alloc_name():
        nonlocal next_index
        while True:
            name = "%03d.mp3" % next_index
            next_index += 1
            if name not in used_names:
                used_names.add(name)
                return name

    # 按原句复用已有录音。新句子另给文件名，避免序号错位。
    for text in all_phrases:
        rel = existing.get(text)
        if not rel:
            rel = "audio/piper/" + alloc_name()
        dest = AUDIO_DIR / Path(rel).name
        stage_file = STAGE_DIR / Path(rel).name
        if dest.is_file() and dest.stat().st_size > 0:
            shutil.copy2(dest, stage_file)
        jobs.append((text, stage_file))
        mapping_order.append(text)

    mapping = {}
    with ThreadPoolExecutor(max_workers=4) as pool:
        for text, url in pool.map(record, jobs):
            mapping[text] = url
            print(url, text)

    # 验证全部目标文件在临时目录中完整生成且非空，再按原文件名写入。
    for text, stage_file in jobs:
        if not stage_file.is_file() or stage_file.stat().st_size == 0:
            raise RuntimeError("Audio file failed to generate: %s (%s)" % (stage_file, text))
        if mapping.get(text) != "audio/piper/" + stage_file.name:
            raise RuntimeError("Audio map drifted for: %s" % text)

    for text, stage_file in jobs:
        shutil.copy2(stage_file, AUDIO_DIR / stage_file.name)

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
    bump_sw_cache()
    print("Successfully built %d audio clips." % len(mapping_order))


if __name__ == "__main__":
    main()
