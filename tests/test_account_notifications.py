from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_account_voice_options_do_not_reference_render_local_state():
    source = (ROOT / "account-system.js").read_text(encoding="utf-8")
    start = source.index("function voiceOptions(")
    end = source.index("function calcAge(", start)
    voice_function = source[start:end]
    assert "function voiceOptions(selected,language=" in voice_function
    assert "const lang=language||'en-NG'" in voice_function
    assert "p?.language" not in voice_function


def test_email_account_flow_handles_upgrade_and_network_errors():
    source = (ROOT / "account-system.js").read_text(encoding="utf-8")
    assert "db.auth.updateUser({email,password,data:" in source
    assert "db.auth.signUp({email,password" in source
    assert "db.auth.signInWithPassword({email,password})" in source
    assert "catch(error){if(msg)msg.textContent=String(error?.message" in source


def test_reply_notifications_are_loaded_and_permission_gated():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    notifications = (ROOT / "notifications.js").read_text(encoding="utf-8")
    assert 'src="notifications.js?v=1.0.0-20261031"' in html
    assert html.index('src="notifications.js?v=1.0.0-20261031"') < html.index('src="account-system.js?')
    assert "Notification.requestPermission()" in notifications
    assert "acerola:reply-ready" in notifications
    assert "acerola:notify" in notifications
    assert "function browserNotice(message)" in notifications
    assert "window.dispatchEvent(new CustomEvent('acerola:reply-ready'" in html
