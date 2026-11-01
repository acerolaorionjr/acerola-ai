from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_image_generation_forwards_reference_images():
    source = (ROOT / "agent-core.js").read_text(encoding="utf-8")
    assert "images = []" in source
    assert "images: Array.isArray(images)" in source
    assert "data: image.data" in source


def test_research_indicator_requires_a_research_tool():
    source = (ROOT / "chatgpt-ux.js").read_text(encoding="utf-8")
    assert "detail?.type==='step'" in source
    assert "tool==='web_search'" in source
    assert "tool==='web.search'" in source
    assert "tool.startsWith('web.search')" in source
    assert "if(!isResearchTool)" in source

def test_explicit_image_requests_bypass_general_planning():
    source = (ROOT / "agent-core.js").read_text(encoding="utf-8")
    assert "const imageIntent =" in source
    assert "this.executePlannedAction" in source
    assert "tool: 'media.generate_image'" in source
