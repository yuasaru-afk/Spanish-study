# 各ユニットに「文法の要点」（レッスン最初の1画面）を足す。2026-10-24 第2版。一度だけ使う（再実行しても上書きするだけ）
import json
from pathlib import Path

CONTENT = Path(__file__).resolve().parent.parent / "content"

POINTS = {
    "u01": (["ていねいなあいさつは時間帯で変わる（días / tardes / noches）",
             "名前は Me llamo ＋名前。相手には ¿Cómo te llamas?",
             "くだけた相手は tú、目上・初対面は usted"],
            [("Buenos días.", "おはようございます。"), ("Me llamo Takashi.", "私の名前はタカシです。")]),
    "u02": (["母音は a e i o u の5つ、いつも同じ音",
             "h は読まない。j と ge・gi は喉の奥の音",
             "強く読む位置にはきまりがあり、外れる時だけ á などの記号"],
            [("jamón", "ハム"), ("gente", "人々")]),
    "u03": (["名詞は男性か女性。-o はたいてい男性、-a はたいてい女性",
             "「その」は el / la、「ある1つの」は un / una",
             "複数は -s か -es。冠詞も los / las / unos / unas に"],
            [("el libro", "その本"), ("una mesa", "1つのテーブル")]),
    "u04": (["ser（〜です）は soy, eres, es, somos, sois, son",
             "国籍・職業・性質など、変わらないことに使う",
             "主語は省略できる。形容詞は男女と数をそろえる"],
            [("Soy japonés.", "私は日本人です。"), ("Ella es alta.", "彼女は背が高い。")]),
    "u05": (["-ar 動詞は -ar を取って語尾を付ける",
             "語尾は -o, -as, -a, -amos, -áis, -an",
             "習慣・今のこと・近い予定まで現在形で言える"],
            [("Hablo español.", "スペイン語を話します。"), ("Trabajamos en Tokio.", "私たちは東京で働いています。")]),
    "u06": (["estar は estoy, estás, está, estamos, estáis, están",
             "場所（どこにいる・ある）と今の状態は estar",
             "変わらない性質は ser。同じ形容詞でも意味が変わる"],
            [("¿Dónde está el baño?", "トイレはどこですか？"), ("Estoy cansado.", "疲れています。")]),
    "u07": (["否定は動詞のすぐ前に no",
             "はい・いいえの疑問文は語順そのまま ¿ ? で挟む",
             "疑問詞は文の先頭、すべてアクセント記号付き"],
            [("No hablo inglés.", "英語は話せません。"), ("¿Cuándo llegas?", "いつ着くの？")]),
    "u08": (["0〜15は丸ごと、31からは treinta y uno のように y でつなぐ",
             "時刻は Es la una／Son las 〜。分は y でつなぐ",
             "曜日は小文字。「〜曜日に」は el lunes"],
            [("¿Qué hora es?", "何時ですか？"), ("Son las ocho y media.", "8時半です。")]),
    "u09": (["「好き」は「〜が私に気に入る」：Me gusta 〜",
             "好きな物が複数なら gustan、動詞の原形なら gusta",
             "誰がは me / te / le / nos / os / les"],
            [("Me gusta el café.", "コーヒーが好きです。"), ("Me gustan los gatos.", "猫が好きです。")]),
    "u10": (["席は Una mesa para dos, por favor.",
             "注文は Quiero／Quisiera（ていねい）／Para mí 〜",
             "会計は La cuenta, por favor."],
            [("Para mí, el pescado.", "私は魚で。"), ("La cuenta, por favor.", "お会計お願いします。")]),
}

for path in sorted(CONTENT.glob("u[0-9]*.json")):
    unit = json.loads(path.read_text(encoding="utf-8"))
    lines, examples = POINTS[unit["id"]]
    points = {"lines": lines, "examples": [{"es": es, "ja": ja} for es, ja in examples]}
    out = {}
    for k, v in unit.items():
        if k == "points":
            continue
        out[k] = v
        if k == "summary":
            out["points"] = points
    path.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print("points", path.name)
