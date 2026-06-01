from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any


TITLE = "党务人才技能选拔赛模拟"
SOURCE_TITLE = "党务人才技能选拔赛模拟试卷（二）"

SECTION_SINGLE = "single"
SECTION_MULTIPLE = "multiple"

MARKER_RE = re.compile(r"(?:正确)?答案[:：]\s*([A-G]+)")
OPTION_RE = re.compile(r"(?<![A-Za-z0-9])([A-G])[\.\、]\s*")
SECTION_RE = re.compile(r"[一二三四五六七八九十]、.*?(单项选择题|多项选择题)")


def clean_fragment(text: str) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    return text.strip("\ufeff")


def clean_option_text(text: str) -> str:
    # One Word run in the source .doc is split through binary control bytes.
    # The readable continuation appears later in the text stream, so normalize
    # that known run here to keep the generated bank deterministic.
    if text.startswith("深入") and re.search(r"[\x00-\x1f\x7f-\x9f]", text):
        return "深入贯彻落实习近平总书记关于党的建设、关于党的自我革命的重要思想"
    return re.sub(r"[\x00-\x1f\x7f-\x9f]", "", text).strip()


def split_fragment(fragment: str) -> list[str]:
    """Split lines that contain several options and an answer in one fragment."""
    markers: list[int] = []
    for pattern in [OPTION_RE, re.compile(r"(?:正确)?答案[:：]")]:
        markers.extend(match.start() for match in pattern.finditer(fragment))
    markers = sorted(set(pos for pos in markers if pos > 0))
    if not markers:
        return [fragment]

    tokens: list[str] = []
    start = 0
    for pos in markers:
        token = clean_fragment(fragment[start:pos])
        if token:
            tokens.append(token)
        start = pos
    tail = clean_fragment(fragment[start:])
    if tail:
        tokens.append(tail)
    return tokens


def read_doc_fragments(path: Path) -> list[str]:
    # The provided .doc stores a readable UTF-16LE text stream amid OLE data.
    raw = path.read_bytes().decode("utf-16le", errors="ignore")
    fragments = [clean_fragment(part) for part in re.split(r"[\x00\r\n\t]+", raw)]
    fragments = [part for part in fragments if part]

    try:
        start = fragments.index(SOURCE_TITLE)
    except ValueError as exc:
        raise RuntimeError(f"未找到试卷标题：{SOURCE_TITLE}") from exc

    tokens: list[str] = []
    for fragment in fragments[start + 1 :]:
        if fragment.startswith("Evaluation Warning:"):
            break
        tokens.extend(split_fragment(fragment))
    return tokens


def option_index(letter: str) -> int:
    return ord(letter) - ord("A")


def build_question(
    index: int,
    section: str,
    category: str,
    stem: str,
    options: list[str],
    answer_letters: str,
) -> dict[str, Any]:
    answer = [option_index(letter) for letter in answer_letters]
    return {
        "id": f"party_{section}_{index:03d}",
        "type": section,
        "category": category,
        "question": stem,
        "options": [{"text": text} for text in options],
        "answer": answer,
    }


def parse_questions(tokens: list[str]) -> list[dict[str, Any]]:
    questions: list[dict[str, Any]] = []
    section: str | None = None
    category = ""
    stem: str | None = None
    options: list[str] = []

    def reset_current() -> None:
        nonlocal stem, options
        stem = None
        options = []

    for token in tokens:
        section_match = SECTION_RE.search(token)
        if section_match:
            name = section_match.group(1)
            if "单项" in name:
                section = SECTION_SINGLE
                category = "单项选择题"
            elif "多项" in name:
                section = SECTION_MULTIPLE
                category = "多项选择题"
            reset_current()
            continue

        if section is None:
            continue

        answer_match = MARKER_RE.match(token)
        if answer_match:
            if stem is None:
                continue
            answer_letters = answer_match.group(1)
            questions.append(
                build_question(
                    len(questions) + 1,
                    section,
                    category,
                    stem,
                    options,
                    answer_letters,
                ),
            )
            reset_current()
            continue

        option_match = OPTION_RE.match(token)
        if option_match and stem is not None:
            text = clean_fragment(token[option_match.end() :])
            text = clean_option_text(text)
            if text:
                options.append(text)
            continue

        # Any non-option text inside a section starts or extends the stem. A
        # few Word fragments split long stems across runs, so join them.
        if stem is None:
            stem = token
        elif not options:
            stem = clean_fragment(stem + token)

    return questions


def validate_bank(questions: list[dict[str, Any]]) -> list[str]:
    errors: list[str] = []
    seen = set()
    for idx, question in enumerate(questions, 1):
        qid = question["id"]
        if qid in seen:
            errors.append(f"第 {idx} 题 id 重复：{qid}")
        seen.add(qid)

        options = question["options"]
        answer = question["answer"]
        if not question["question"]:
            errors.append(f"第 {idx} 题缺少题干")
        if len(options) < 2:
            errors.append(f"第 {idx} 题选项少于 2 个：{question['question']}")
        if any(a < 0 or a >= len(options) for a in answer):
            errors.append(f"第 {idx} 题答案超出选项范围：{question['question']}")
        if question["type"] == "single" and len(answer) != 1:
            errors.append(f"第 {idx} 题单选答案数量不是 1：{question['question']}")
        if question["type"] == "multiple" and len(answer) < 1:
            errors.append(f"第 {idx} 题多选答案为空：{question['question']}")
    return errors


def main() -> int:
    if len(sys.argv) != 3:
        print("用法: python scripts/extract-party-bank.py <试卷.doc> <输出.json>")
        return 2

    src = Path(sys.argv[1])
    dst = Path(sys.argv[2])
    questions = parse_questions(read_doc_fragments(src))
    errors = validate_bank(questions)
    if errors:
        print("题库转换校验失败：", file=sys.stderr)
        for error in errors[:80]:
            print(f"- {error}", file=sys.stderr)
        if len(errors) > 80:
            print(f"... 还有 {len(errors) - 80} 条", file=sys.stderr)
        return 1

    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(
        json.dumps(questions, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    single = sum(1 for q in questions if q["type"] == "single")
    multiple = sum(1 for q in questions if q["type"] == "multiple")
    max_options = max(len(q["options"]) for q in questions)
    print(f"title={TITLE}")
    print(f"total={len(questions)} single={single} multiple={multiple}")
    print(f"max_options={max_options}")
    print(f"output={dst}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
