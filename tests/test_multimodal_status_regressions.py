from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_image_generation_forwards_reference_images():
    source = (ROOT / "agent-core.js").read_text(encoding="utf-8")
    assert "images = []" in source
    assert "images: Array.isArray(images)" in source
    assert "data: image.data" in source


def test_research_indicator_requires_a_research_tool():
    source = (ROOT / "chatgpt-ux.js").read_text(encoding="utf-8")
    assert "const isResearchTool=tool.includes('search')||tool.includes('research')||tool.startsWith('web.')" in source
    assert "if(!isResearchTool)" in source
