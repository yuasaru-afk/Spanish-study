# 穴埋め（キーボード入力）の問題を3択に置き換える（2026-10-24、ユーザーの「単語入力させるのはやめよう」）。一度だけ使う
import json
from pathlib import Path

CONTENT = Path(__file__).resolve().parent.parent / "content"

# (ユニット, 問題番号): (新しい問い, [(誤答, なぜ違うか), (誤答, なぜ違うか)])。正解と正解の why は元の問題から取る
WRONG = {
    ("u01", 3): ("空欄に入るのは？", [
        ("llama", "llama は「彼・彼女・あなたは〜という名前」。自分の名前は llamo。"),
        ("llamas", "llamas は「君は〜という名前」。¿Cómo te llamas? の形です。")]),
    ("u01", 6): ("空欄に入るのは？", [
        ("Hola", "hola は会ったときのあいさつ。別れには adiós。"),
        ("Gracias", "gracias は「ありがとう」。別れのあいさつではありません。")]),
    ("u02", 5): ("空欄に入る文字は？", [
        ("n", "n だと mana という別のつづりになります。にゃ行の音は ñ という別の文字。"),
        ("ni", "ni と書くと mani-ana のように音がずれます。にゃ行の音は1文字の ñ で書きます。")]),
    ("u02", 6): ("正しいつづりは？", [
        ("cafe", "記号がないと、母音で終わる語のきまりで ca を強く読むことになります。e を強く読むので é が要ります。"),
        ("cáfe", "記号の位置が違います。強く読むのは最後の e なので café。")]),
    ("u03", 4): ("ciudad の複数形は？", [
        ("ciudads", "子音で終わる語は -s ではなく -es を付けます。"),
        ("ciudad", "las（複数の冠詞）に合わせて名詞も複数形にします。")]),
    ("u03", 5): ("空欄に入るのは？", [
        ("las", "las は女性名詞の複数用。libro は男性名詞なので los。"),
        ("el", "el は単数用。libros（複数）には los。")]),
    ("u04", 1): ("空欄に入るのは？", [
        ("son", "son は ellos・ellas・ustedes の形。「私たち」は somos。"),
        ("es", "es は él・ella・usted の形です。")]),
    ("u04", 2): ("空欄に入るのは？", [
        ("es", "es は él・ella・usted の形。tú には eres。"),
        ("soy", "soy は yo（私）の形です。")]),
    ("u04", 7): ("空欄に入る alto の形は？", [
        ("alto", "alto は男性形。ella（女性）には alta。"),
        ("altas", "altas は女性の複数形。ella は1人なので alta。")]),
    ("u05", 1): ("空欄に入るのは？", [
        ("trabaja", "trabaja は él・ella・usted の形。tú の語尾は -as。"),
        ("trabajo", "trabajo は yo（私）の形です。")]),
    ("u05", 2): ("空欄に入るのは？", [
        ("estudian", "estudian は ellos・ustedes の形。nosotros の語尾は -amos。"),
        ("estudio", "estudio は yo（私）の形です。")]),
    ("u05", 4): ("空欄に入るのは？", [
        ("necesitas", "necesitas は tú の形。usted は él・ella と同じ -a。"),
        ("necesito", "necesito は yo（私）の形です。")]),
    ("u05", 8): ("空欄に入るのは？", [
        ("llegan", "llegan は複数の主語の形。el tren は1本なので llega。"),
        ("llegar", "llegar は原形のまま。主語 el tren に合わせて活用させます。")]),
    ("u06", 2): ("空欄に入るのは？", [
        ("soy", "soy は ser の形。疲れているのは今の状態なので estar（estoy）。"),
        ("está", "está は él・ella・usted の形。yo には estoy。")]),
    ("u06", 4): ("空欄に入るのは？", [
        ("es", "es は ser。体調・気分は今の状態なので estar（está）。"),
        ("estás", "estás は tú の形。usted は él・ella と同じ está。")]),
    ("u06", 7): ("空欄に入るのは？", [
        ("somos", "somos は ser。いる場所は estar（estamos）。"),
        ("están", "están は ellos・ustedes の形。nosotros には estamos。")]),
    ("u07", 3): ("空欄に入るのは？", [
        ("Dónde", "dónde は「どこ」。時をたずねる「いつ」は cuándo。"),
        ("Cuando", "疑問詞の cuándo には á のアクセント記号が付きます。記号なしの cuando は「〜するとき」という別の語。")]),
    ("u07", 5): ("空欄に入るのは？", [
        ("Qué", "qué は「何」。値段をたずねる「いくら」は cuánto。"),
        ("Cuándo", "cuándo は「いつ」。値段には cuánto。")]),
    ("u08", 1): ("空欄に入るのは？", [
        ("Es", "es la は1時のときだけ。3時は複数なので son las。"),
        ("Está", "時刻を言うときは estar ではなく ser（es / son）を使います。")]),
    ("u08", 4): ("16 はどれ？", [
        ("diez y seis", "16〜19は dieci ＋ 1の位を1語で書きます：dieciséis。"),
        ("sesenta", "sesenta は 60。16 は dieciséis。")]),
    ("u08", 5): ("31 はどれ？", [
        ("treintiuno", "1語にするのは 21〜29（veintiuno など）だけ。31 からは y でつないで3語。"),
        ("trece y uno", "trece は 13。30 は treinta なので treinta y uno。")]),
    ("u09", 1): ("空欄に入るのは？", [
        ("gustan", "gustan は好きな物が複数のとき。動詞の原形（viajar）は単数扱いで gusta。"),
        ("gusto", "gustar の主語は好きな物。「私」に合わせた gusto は使いません。")]),
    ("u09", 6): ("空欄に入るのは？", [
        ("gustamos", "主語は好きな物 la comida japonesa（単数）。nos（私たち）に合わせて活用はしません。"),
        ("gustan", "gustan は好きな物が複数のとき。la comida japonesa は単数なので gusta。")]),
    ("u09", 8): ("空欄に入るのは？", [
        ("te", "te は tú（君）に使う形。usted には le。"),
        ("me", "me は「私は」。相手（usted）のことを聞くので le。")]),
    ("u10", 2): ("空欄に入るのは？", [
        ("carta", "la carta はメニュー。会計は la cuenta。"),
        ("mesa", "la mesa はテーブル。会計は la cuenta。")]),
    ("u10", 4): ("空欄に入るのは？", [
        ("con", "con gas は「炭酸入り」。炭酸なしは sin gas。"),
        ("de", "agua de 〜 は「〜の水」になります。「〜なし」は sin。")]),
    ("u10", 8): ("空欄に入るのは？", [
        ("quero", "querer は不規則で、e が ie に変わります：quiero。"),
        ("quiere", "quiere は él・ella・usted の形。yo には quiero。")]),
}

for path in sorted(CONTENT.glob("u[0-9]*.json")):
    unit = json.loads(path.read_text(encoding="utf-8"))
    changed = False
    for i, q in enumerate(unit["practice"]):
        if q["type"] != "fill":
            continue
        prompt, wrong = WRONG[(unit["id"], i)]
        cap = (lambda t: t[0].upper() + t[1:]) if q["es"].startswith(("___", "¿___")) else (lambda t: t)
        right = cap(q["answers"][0])
        # 正解の位置を問題ごとにずらす（いつも1番目が正解にならないように）
        opts = [{"text": cap(t), "correct": False, "why": w} for t, w in wrong]
        opts.insert(i % 3, {"text": right, "correct": True, "why": q["why"]})
        unit["practice"][i] = {"type": "choice", "prompt": prompt, "es": q["es"], "ja": q["ja"], "options": opts}
        changed = True
    if changed:
        path.write_text(json.dumps(unit, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print("updated", path.name)
