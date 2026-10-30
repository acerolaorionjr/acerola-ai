/* Acerola AI — portable chat backup and restore.
 * Local-only data export/import; no chat data is uploaded anywhere.
 */
(() => {
  'use strict';
  const STORAGE_KEY = 'acerola-ai-chats-v6';
  const MAX_FILE_BYTES = 5 * 1024 * 1024;
  const MAX_CHATS = 200;
  const MAX_MESSAGES_PER_CHAT = 500;
  const MAX_MESSAGE_LENGTH = 100000;
  const $ = (id) => document.getElementById(id);

  function readChats() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  }

  function downloadBackup() {
    const chats = readChats();
    const backup = {
      format: 'acerola-ai-chat-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      chats
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'acerola-ai-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce('Backup downloaded. Keep the file somewhere safe.');
  }

  function normalizeChat(chat, index) {
    if (!chat || typeof chat !== 'object' || Array.isArray(chat)) throw new Error('A chat entry is invalid.');
    if (!Array.isArray(chat.messages) || chat.messages.length > MAX_MESSAGES_PER_CHAT) {
      throw new Error('A chat contains too many messages or has an invalid message list.');
    }
    const messages = chat.messages.map((message) => {
      if (!message || typeof message !== 'object' || Array.isArray(message)) throw new Error('A message entry is invalid.');
      const role = ['user', 'assistant', 'system'].includes(message.role) ? message.role : null;
      if (!role || typeof message.content !== 'string' || message.content.length > MAX_MESSAGE_LENGTH) {
        throw new Error('A message has an unsupported role or invalid content.');
      }
      const clean = { role, content: message.content };
      if (Number.isFinite(message.at)) clean.at = message.at;
      if (message.feedback === 'good' || message.feedback === 'bad') clean.feedback = message.feedback;
      if (Array.isArray(message.sources)) {
        clean.sources = message.sources.slice(0, 10).filter(s => s && typeof s.url === 'string' && /^https?:\/\//i.test(s.url))
          .map(s => ({ url: s.url.slice(0, 2048), title: String(s.title || '').slice(0, 300) }));
      }
      return clean;
    });
    const now = Date.now();
    return {
      id: typeof chat.id === 'string' && chat.id.length <= 160 ? chat.id : 'imported-' + now + '-' + index,
      title: String(chat.title || 'Imported chat').slice(0, 300),
      createdAt: Number.isFinite(chat.createdAt) ? chat.createdAt : now,
      updatedAt: Number.isFinite(chat.updatedAt) ? chat.updatedAt : now,
      messages
    };
  }

  function restoreBackup(file) {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      announce('Backup is too large. Choose a JSON file under 5 MB.', true);
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => announce('The backup file could not be read.', true);
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || ''));
        if (!data || data.format !== 'acerola-ai-chat-backup' || data.version !== 1 || !Array.isArray(data.chats)) {
          throw new Error('This is not a supported Acerola AI chat backup.');
        }
        if (data.chats.length > MAX_CHATS) throw new Error('This backup contains too many chats.');
        const existing = readChats();
        const ids = new Set(existing.map(c => String(c.id)));
        const imported = data.chats.map(normalizeChat);
        let added = 0;
        for (const chat of imported) {
          if (ids.has(chat.id)) chat.id = 'import-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
          ids.add(chat.id);
          existing.push(chat);
          added++;
        }
        if (existing.length > MAX_CHATS) throw new Error('Restoring this backup would exceed the 200-chat limit. Export your chats first and remove some older chats.');
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
        if (typeof window.renderHistory === 'function') window.renderHistory();
        announce('Restored ' + added + ' chat' + (added === 1 ? '' : 's') + '. Existing chats were kept.');
      } catch (error) {
        announce(error?.message || 'The backup could not be restored.', true);
      }
    };
    reader.readAsText(file);
  }

  function announce(message, isError = false) {
    let status = $('acerola-backup-status');
    if (!status) {
      status = document.createElement('div');
      status.id = 'acerola-backup-status';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      status.style.cssText = 'position:fixed;left:50%;bottom:calc(88px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:100000;max-width:calc(100vw - 28px);padding:12px 15px;border:1px solid #454545;border-radius:14px;background:#262626;color:#f2f2f2;box-shadow:0 10px 35px #0008;font:13px/1.45 system-ui,sans-serif';
      document.body.appendChild(status);
    }
    status.textContent = message;
    status.style.borderColor = isError ? '#a44b4b' : '#454545';
    clearTimeout(status._timer);
    status._timer = setTimeout(() => status.remove(), 5000);
  }

  function install() {
    const row = document.querySelector('.drawer-new-row');
    if (!row || $('acerola-backup-row')) return;
    const extra = document.createElement('div');
    extra.id = 'acerola-backup-row';
    extra.style.cssText = 'display:flex;gap:8px;padding:8px 12px 10px';
    const buttonStyle = 'flex:1;min-height:40px;border:1px solid #414141;border-radius:12px;background:#2b2b2b;color:#ededed;font:12px system-ui,sans-serif;cursor:pointer;touch-action:manipulation';
    const exportButton = document.createElement('button');
    exportButton.type = 'button';
    exportButton.textContent = '↓ Back up chats';
    exportButton.style.cssText = buttonStyle;
    exportButton.addEventListener('click', downloadBackup);
    const importButton = document.createElement('button');
    importButton.type = 'button';
    importButton.textContent = '↑ Restore backup';
    importButton.style.cssText = buttonStyle;
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/json,.json';
    fileInput.hidden = true;
    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (file && confirm('Restore chats from this backup? Your existing chats will be kept.')) restoreBackup(file);
      fileInput.value = '';
    });
    importButton.addEventListener('click', () => fileInput.click());
    extra.append(exportButton, importButton, fileInput);
    row.insertAdjacentElement('afterend', extra);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
  const observer = new MutationObserver(install);
  if (document.documentElement) observer.observe(document.documentElement, { childList: true, subtree: true });
  window.AcerolaChatBackup = { exportChats: downloadBackup, restoreFile: restoreBackup };
})();
