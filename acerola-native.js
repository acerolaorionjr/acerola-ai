(() => {
  'use strict';

  const cap = window.Capacitor;
  const plugins = cap?.Plugins || {};
  const native = !!cap?.isNativePlatform?.();

  // Keep the native bridge deliberately defensive: the web app must remain
  // usable even when a native plugin is unavailable or the WebView is old.
  const app = plugins.App;
  const status = plugins.StatusBar;
  const keyboard = plugins.Keyboard;

  const getSpeech = () => cap?.Plugins?.SpeechRecognition || null;

  window.AcerolaNative = {
    native,
    speechAvailable: !!getSpeech(),
    async startSpeech() {
      const speech = getSpeech();
      if (!speech) return '';
      await speech.requestPermissions();
      const result = await speech.start({
        language: navigator.language || 'en-US',
        maxResults: 3,
        partialResults: false,
        popup: false
      });
      return result?.matches?.[0] || '';
    },
    async stopSpeech() {
      const speech = getSpeech();
      if (speech) {
        await speech.stop().catch(() => {});
      }
    }
  };

  async function boot() {
    if (!native) return;

    try {
      await status?.setBackgroundColor?.({ color: '#050505' });
      await status?.setStyle?.({ style: 'DARK' });
    } catch (_) {}

    try {
      await keyboard?.setResizeMode?.({ mode: 'body' });
    } catch (_) {}

    if (app?.addListener) {
      try {
        await app.addListener('backButton', async () => {
          const drawer = document.getElementById('drawer');
          const modal = document.getElementById('modal');

          if (drawer?.classList.contains('open')) {
            document.getElementById('drawerClose')?.click();
            return;
          }
          if (modal?.classList.contains('open')) {
            document.getElementById('close')?.click();
            return;
          }

          try {
            await app.minimizeApp?.();
          } catch (_) {}
        });
      } catch (_) {}
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const mic = document.getElementById('mic');
    const speech = getSpeech();
    if (!mic || !speech) return;

    mic.onclick = async () => {
      try {
        mic.classList.add('active');
        const text = await window.AcerolaNative.startSpeech();
        if (text) {
          const input = document.querySelector('#input');
          if (input) {
            input.value = text;
            input.dispatchEvent(new Event('input'));
          }
        }
      } catch (error) {
        console.warn('Native speech:', error);
        alert('Microphone could not be started. Please allow microphone access and try again.');
      } finally {
        mic.classList.remove('active');
      }
    };
  });

  boot();
})();
