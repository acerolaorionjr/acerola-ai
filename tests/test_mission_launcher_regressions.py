from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_homepage_mission_cards_submit_their_prompts():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    assert "window.acerolaSend()" in html
    assert "b.onclick=()=>{if(!b.dataset.p||typeof window.acerolaSend!=='function')return;" in html


def test_repository_inspection_uses_real_newline_delimiters():
    source = (ROOT / "agent-tools.js").read_text(encoding="utf-8")
    assert ".split('\\n')" in source
    assert ".join('\\n')" in source
    assert ".split('\\\\n')" not in source
    assert ".join('\\\\n')" not in source
