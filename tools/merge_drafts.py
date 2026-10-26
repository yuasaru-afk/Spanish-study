# drafts/u11〜u20 を content/ に取り込む（2026-10-26）。一度きり
# - 前のユニットと重複する単語 id は、後のユニットから外す（先に出た所で覚える）
# - 3択の選択肢の並びを問題文から決まる順に並べ直す（正解の位置が規則的にならないように）
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
DRAFTS = ROOT / "drafts"


def shuffled(q):
    def key(o):
        return hashlib.sha1((q.get("es", "") + q["prompt"] + o["text"]).encode("utf-8")).hexdigest()
    return sorted(q["options"], key=key)


index = json.loads((CONTENT / "units.json").read_text(encoding="utf-8"))
seen = set()
for entry in index:
    seen.update(w["id"] for w in json.loads((CONTENT / entry["file"]).read_text(encoding="utf-8"))["words"])

for n in range(11, 21):
    uid = f"u{n}"
    unit = json.loads((DRAFTS / f"{uid}.json").read_text(encoding="utf-8"))
    dropped = [w["id"] for w in unit["words"] if w["id"] in seen]
    unit["words"] = [w for w in unit["words"] if w["id"] not in seen]
    seen.update(w["id"] for w in unit["words"])
    for q in unit["practice"]:
        if q["type"] == "choice":
            q["options"] = shuffled(q)
    (CONTENT / f"{uid}.json").write_text(json.dumps(unit, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    if not any(e["id"] == uid for e in index):
        index.append({"id": uid, "no": n, "title": unit["title"], "file": f"{uid}.json"})
    pos = "".join(str(next(i for i, o in enumerate(q["options"]) if o["correct"])) for q in unit["practice"] if q["type"] == "choice")
    print(uid, "words", len(unit["words"]), "dropped", dropped, "correct-pos", pos)

(CONTENT / "units.json").write_text(json.dumps(index, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
