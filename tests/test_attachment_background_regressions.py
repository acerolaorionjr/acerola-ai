from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_attachment_drafts_are_persisted_in_indexeddb():
    source = (ROOT / "index.html").read_text(encoding="utf-8")
    assert "acerola-attachment-drafts-v2" in source
    assert "persistDraftAttachments" in source
    assert "restoreDraftAttachments" in source


def test_sent_message_attachments_survive_reload_and_retry():
    source = (ROOT / "index.html").read_text(encoding="utf-8")
    assert "persistMessageAttachments" in source
    assert "restoreMessageAttachments" in source
    assert "previous.attachmentData" in source


def test_background_reply_notifications_use_service_worker():
    ux = (ROOT / "chatgpt-ux.js").read_text(encoding="utf-8")
    sw = (ROOT / "sw.js").read_text(encoding="utf-8")
    assert "registration.showNotification(title,options)" in ux
    assert "document.hidden||d.chatId!==getActiveChatId()" in ux
    assert "ACEROLA_OPEN_CHAT" in ux
    assert "self.addEventListener('push'" in sw
    assert "self.addEventListener('notificationclick'" in sw
