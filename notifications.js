/* Acerola browser notifications. Runs independently of Supabase so local UI alerts still work. */
(() => {
  'use strict';
  const KEY = 'acerola-ai-notifications-enabled';
  const enabled = () => { try { return localStorage.getItem(KEY) === 'true'; } catch (_) { return false; } };
  const buttonMarkup = () => '<button class="account-btn secondary" id="enableNotifications">Enable reply notifications</button>';
  window.acerolaNotificationButtonMarkup = buttonMarkup;

  function toast(message) {
    let el = document.getElementById('acerola-notification-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'acerola-notification-toast';
      el.style.cssText = 'position:fixed;z-index:10050;left:50%;bottom:calc(95px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);max-width:min(92vw,480px);padding:12px 16px;border:1px solid #343434;border-radius:14px;background:#202020;color:#fff;box-shadow:0 8px 30px #0008;font:13px/1.45 system-ui;';
      document.body.appendChild(el);
    }
    el.textContent = String(message || 'Acerola notification').slice(0, 240);
    el.style.display = 'block';
    clearTimeout(window.__acerolaToastTimer);
    window.__acerolaToastTimer = setTimeout(() => { el.style.display = 'none'; }, 4500);
  }

  function browserNotice(message) {
    if (!enabled() || !('Notification' in window) || Notification.permission !== 'granted' || !document.hidden) return;
    try {
      new Notification('Acerola', {
        body: String(message || 'Acerola has replied.').slice(0, 180),
        tag: 'acerola-reply',
        icon: new URL('icon.svg', location.href).href
      });
    } catch (_) {}
  }

  window.acerolaBindNotifications = () => {
    const button = document.getElementById('enableNotifications');
    const message = document.getElementById('accMsg');
    if (!button) return;
    const paint = () => {
      button.textContent = enabled() ? 'Disable reply notifications' : 'Enable reply notifications';
      button.setAttribute('aria-pressed', enabled() ? 'true' : 'false');
    };
    paint();
    button.onclick = async () => {
      if (enabled()) {
        try { localStorage.removeItem(KEY); } catch (_) {}
        paint();
        if (message) message.textContent = 'Reply notifications disabled.';
        return;
      }
      if (!('Notification' in window)) {
        if (message) message.textContent = 'This browser does not support notifications. Keep Acerola open to see replies.';
        return;
      }
      try {
        const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
        if (permission !== 'granted') {
          if (message) message.textContent = 'Notifications are blocked. Allow notifications for this site in your browser settings, then try again.';
          return;
        }
        localStorage.setItem(KEY, 'true');
        paint();
        if (message) message.textContent = 'Notifications enabled. Acerola can notify you when a reply is ready while this page is in the background.';
        new Notification('Acerola notifications enabled', { body: 'You will be notified when Acerola finishes replying while this page is in the background.' });
      } catch (error) {
        if (message) message.textContent = 'Could not enable notifications: ' + String(error?.message || error);
      }
    };
  };

  window.addEventListener('acerola:notify', event => {
    const message = String(event?.detail?.message || 'Acerola notification').slice(0, 240);
    toast(message);
    browserNotice(message);
  });
  window.addEventListener('acerola:reply-ready', event => {
    browserNotice(event?.detail?.message || 'Acerola has replied.');
  });
})();
