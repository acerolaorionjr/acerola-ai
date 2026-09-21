import os
import pytest
import requests

class MockAgentCore:
    def __init__(self, engine_version="0.8.0", core_version="1.4.0"):
        self.engine_version = engine_version
        self.core_version = core_version
        self.max_allowed_files = 5
        self.active_workspace = "Code"
        self.session_secure = True

    def process_multimodal_input(self, text_prompt, files_list):
        if len(files_list) > self.max_allowed_files:
            raise ValueError(
                f"Payload Reject: Maximum allowed files exceeded ({self.max_allowed_files})"
            )
        return {
            "status": "SUCCESS",
            "processed_files": len(files_list),
            "engine_routing": f"v{self.engine_version}-Luna-Direct",
            "workspace_context": self.active_workspace,
            "agent_state": "READY",
        }

@pytest.fixture
def agent():
    return MockAgentCore()

def test_core_initialization(agent):
    assert agent.engine_version == "0.8.0"
    assert agent.core_version == "1.4.0"
    assert agent.session_secure is True

def test_nominal_file_processing(agent):
    response = agent.process_multimodal_input(
        "Analyze framework structure",
        ["doc1.pdf", "data_sheet.csv", "vision_source.png"],
    )
    assert response["status"] == "SUCCESS"
    assert response["processed_files"] == 3
    assert response["workspace_context"] == "Code"

def test_five_file_boundary_is_accepted(agent):
    response = agent.process_multimodal_input(
        "Run batch analysis",
        ["f1.pdf", "f2.pdf", "f3.png", "f4.docx", "f5.xlsx"],
    )
    assert response["status"] == "SUCCESS"
    assert response["processed_files"] == 5

def test_file_overflow_guardrail(agent):
    files = ["f1.pdf", "f2.pdf", "f3.png", "f4.docx", "f5.xlsx", "f6.json"]
    with pytest.raises(ValueError, match="Maximum allowed files exceeded"):
        agent.process_multimodal_input("Run batch analysis", files)

def test_workspace_context_switching(agent):
    agent.active_workspace = "Analyze"
    response = agent.process_multimodal_input("Process image context", ["img.png"])
    assert response["workspace_context"] == "Analyze"

@pytest.mark.live
def test_live_gateway_smoke():
    url = os.getenv("ACEROLA_GATEWAY_URL")
    token = os.getenv("ACEROLA_ACCESS_TOKEN")
    if not url or not token:
        pytest.skip("Live gateway credentials are not configured.")
    response = requests.get(
        url,
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )
    assert response.status_code < 500
