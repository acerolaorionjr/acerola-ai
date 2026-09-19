/* Acerola Agent Tools v1.2.0
 * Browser/device capabilities. All permissioned APIs remain user-controlled.
 */
(function (global) {
  'use strict';

  const text = value => String(value ?? '').trim();

  function installTools(core) {
    if (!core || !core.tools) return core;

    core.tools
      .register('browser.clipboard.write', async ({ text: value }) => {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard write is unavailable in this browser.');
        await navigator.clipboard.writeText(text(value));
        return { ok: true, written: true };
      }, 'Copy text to the user clipboard after browser permission/user gesture where required.')

      .register('browser.clipboard.read', async ({ confirmed = false } = {}) => {
        if (!confirmed) throw new Error('Clipboard read requires explicit user confirmation.');
        if (!navigator.clipboard?.readText) throw new Error('Clipboard read is unavailable in this browser.');
        return { ok: true, text: await navigator.clipboard.readText() };
      }, 'Read text from the user clipboard only after explicit user confirmation.')

      .register('browser.speak', ({ text: value, rate = 1, pitch = 1 }) => {
        if (!('speechSynthesis' in global)) throw new Error('Text-to-speech is unavailable.');
        const message = text(value);
        if (!message) throw new Error('Text is required.');
        global.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(message.slice(0, 5000));
        utterance.rate = Math.min(2, Math.max(.5, Number(rate) || 1));
        utterance.pitch = Math.min(2, Math.max(.5, Number(pitch) || 1));
        global.speechSynthesis.speak(utterance);
        return { ok: true, speaking: true };
      }, 'Speak a response aloud using the device browser voice engine.')

      .register('browser.stop_speaking', () => {
        if ('speechSynthesis' in global) global.speechSynthesis.cancel();
        return { ok: true, speaking: false };
      }, 'Stop Acerola text-to-speech.')
      .register('voice.listen', ({ confirmed = false, language = '' } = {}) => {
        if (!confirmed) throw new Error('Microphone listening requires explicit user confirmation.');
        const SR = global.SpeechRecognition || global.webkitSpeechRecognition;
        if (!SR) throw new Error('Voice input is unavailable in this browser.');
        return new Promise((resolve, reject) => {
          const recognition = new SR();
          recognition.lang = text(language) || navigator.language || 'en-US';
          recognition.interimResults = false;
          recognition.continuous = false;
          recognition.maxAlternatives = 1;
          let settled = false;
          const finish = (fn, value) => { if (settled) return; settled = true; fn(value); };
          recognition.onresult = event => {
            const transcript = [...event.results].map(r => r[0]?.transcript || '').join(' ').trim();
            finish(resolve, { ok: true, transcript });
          };
          recognition.onerror = event => finish(reject, new Error(event.error || 'Voice recognition failed.'));
          recognition.onend = () => { if (!settled) finish(resolve, { ok: true, transcript: '' }); };
          try { recognition.start(); } catch (error) { finish(reject, error); }
        });
      }, 'Listen for one short spoken instruction after the user explicitly starts microphone input.')

      .register('browser.notification', async ({ title = 'Acerola', message }) => {
        const body = text(message);
        if (!body) throw new Error('Notification message is required.');
        if (!('Notification' in global)) throw new Error('Browser notifications are unavailable.');
        if (Notification.permission === 'default') await Notification.requestPermission();
        if (Notification.permission !== 'granted') throw new Error('Notification permission was not granted.');
        new Notification(text(title) || 'Acerola', { body: body.slice(0, 240) });
        return { ok: true, notified: true };
      }, 'Show a local browser notification after the user grants permission.')

      .register('browser.share', async ({ title = 'Acerola', text: message, url = '' }) => {
        if (!navigator.share) throw new Error('Web Share is unavailable on this device/browser.');
        const payload = { title: text(title) };
        if (message) payload.text = text(message).slice(0, 10000);
        if (url) {
          const value = text(url);
          if (!/^https?:\/\//g/i.test(value)) throw new Error('Share URL must use http or https.');
          payload.url = value;
        }
        await navigator.share(payload);
        return { ok: true, shared: true };
      }, 'Open the device share sheet for user-approved sharing.')

      .register('browser.open_url', ({ url }) => {
        const value = text(url);
        if (!/^https?:\/\//g/i.test(value)) throw new Error('Only http and https URLs can be opened.');
        global.open(value, '_blank', 'noopener,noreferrer');
        return { ok: true, opened: value };
      }, 'Open a safe http/https URL in a new browser tab/window.')

      .register('browser.location', async () => {
        if (!navigator.geolocation) throw new Error('Geolocation is unavailable.');
        return await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            p => resolve({ ok: true, latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy_m: Math.round(p.coords.accuracy) }),
            e => reject(new Error(e.message || 'Location permission was not granted.')),
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
          );
        });
      }, 'Read the device location only after the browser asks the user for permission.')

      .register('browser.storage.get', ({ key }) => {
        const k = text(key);
        if (!k) throw new Error('Storage key is required.');
        const value = global.localStorage?.getItem(k);
        return { ok: true, key: k, value };
      }, 'Read a value from this Acerola site local storage.')

      .register('browser.storage.set', ({ key, value }) => {
        const k = text(key);
        if (!k || k.length > 200) throw new Error('Invalid storage key.');
        const v = typeof value === 'string' ? value : JSON.stringify(value);
        if (v.length > 100000) throw new Error('Storage value is too large.');
        global.localStorage?.setItem(k, v);
        return { ok: true, key: k };
      }, 'Store a small value in this Acerola site local storage.');

    core.tools.register('system.permissions', () => ({
      clipboard: !!navigator.clipboard,
      speech: 'speechSynthesis' in global,
      notifications: 'Notification' in global,
      share: !!navigator.share,
      geolocation: !!navigator.geolocation,
      camera: !!(navigator.mediaDevices?.getUserMedia)
    }), 'Report browser capability availability without requesting permissions.');

    return core;
  }

  global.AcerolaAI = Object.assign(global.AcerolaAI || {}, { installTools });
})(window);
