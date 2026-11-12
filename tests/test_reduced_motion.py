from pathlib import Path


def test_agent_runtime_respects_reduced_motion_preference():
    source = (Path(__file__).resolve().parents[1] / "agent-core.js").read_text(
        encoding="utf-8"
    )

    assert "@media(prefers-reduced-motion:reduce)" in source
    assert "animation-duration:.01ms!important" in source
    assert "animation-iteration-count:1!important" in source
    assert "transition-duration:.01ms!important" in source
    assert "scroll-behavior:auto!important" in source
