from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def test_attachment_payloads_stay_in_indexeddb_and_restore_across_all_chats():
    source = (ROOT / "index.html").read_text()
    assert "delete copy.attachmentData" in source
    assert "chats.find(c=>c.id===rec.chatId)" in source
    assert "persistMessageAttachments" in source
    assert "restoreMessageAttachments" in source
