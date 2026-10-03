/* Chat history UX is implemented by index.html.
   Keep this module intentionally passive so there is no visible delete button.
   Deleting/renaming a chat is available only through a long-press/context menu. */
(()=>{'use strict';
  const style=document.createElement('style');
  style.textContent='.history .chat-item{touch-action:pan-y;user-select:none;-webkit-user-select:none}.history .chat-item:focus-visible{outline:2px solid rgba(32,246,255,.45);outline-offset:1px}';
  document.head.appendChild(style);
})();