/* ====================================================
   FITNESSIFY AI — Vita Chat Assistant
   ==================================================== */

const ChatManager = (() => {
  let conversationHistory = [];
  let isTyping = false;

  function appendMessage(role, content, containerId = 'chatMessages') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const user = window._reportUser || { name: 'User' };
    const isUser = role === 'user';
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const div = document.createElement('div');
    div.className = `chat-message ${isUser ? 'user-msg' : 'vita-msg'} animate-fade-up`;
    div.innerHTML = `
      <div class="msg-avatar">${isUser ? escapeHtml(user.name.charAt(0).toUpperCase()) : '🤖'}</div>
      <div class="msg-bubble">
        <div class="msg-content">${escapeHtml(content).replace(/\n/g, '<br>')}</div>
        <div class="msg-time">${time}</div>
      </div>`;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function showTypingIndicator(containerId = 'chatMessages') {
    const container = document.getElementById(containerId);
    if (!container) return;

    removeTypingIndicator();

    const div = document.createElement('div');
    div.id = 'typingIndicator';
    div.className = 'chat-message vita-msg';
    div.innerHTML = `
      <div class="msg-avatar">🤖</div>
      <div class="msg-bubble">
        <div class="typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>`;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function removeTypingIndicator() {
    const existing = document.getElementById('typingIndicator');
    if (existing) existing.remove();
  }

  async function sendMessage(inputId, containerId = 'chatMessages') {
    if (isTyping) return;

    const inputEl = document.getElementById(inputId);
    if (!inputEl) return;

    const message = inputEl.value.trim();
    if (!message) return;

    inputEl.value = '';
    inputEl.style.height = 'auto';

    appendMessage('user', message, containerId);
    conversationHistory.push({ role: 'user', content: message });

    isTyping = true;
    showTypingIndicator(containerId);

    const sendBtn = document.getElementById('chatSendBtn');
    if (sendBtn) sendBtn.disabled = true;
    inputEl.disabled = true;

    try {
      const data = await apiRequest('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: conversationHistory })
      });
      AuthManager.trackEvent('vita.chat_used');
      const response = data.reply || 'I was unable to generate a reply just now.';
      conversationHistory.push({ role: 'assistant', content: response });
      removeTypingIndicator();
      appendMessage('assistant', response, containerId);
    } catch (error) {
      removeTypingIndicator();
      appendMessage('assistant', `I hit a connection issue just now: ${error.message}`, containerId);
    } finally {
      isTyping = false;
      if (sendBtn) sendBtn.disabled = false;
      inputEl.disabled = false;
      inputEl.focus();
    }
  }

  async function init(inputId = 'chatInput', containerId = 'chatMessages') {
    const user = await AuthManager.getCurrentUser();
    if (!user) return;

    const name = user.name.split(' ')[0];
    const container = document.getElementById(containerId);
    if (container && !container.children.length) {
      appendMessage(
        'assistant',
        `Hey ${name}! I'm Vita, your wellness coach. Ask me about hydration, nutrition, sleep, movement, stress, or how to fit healthier habits into your day.`,
        containerId
      );
    }

    const inputEl = document.getElementById(inputId);
    const sendBtn = document.getElementById('chatSendBtn');

    if (inputEl && !inputEl.dataset.bound) {
      inputEl.dataset.bound = 'true';
      inputEl.addEventListener('input', () => {
        inputEl.style.height = 'auto';
        inputEl.style.height = `${Math.min(inputEl.scrollHeight, 120)}px`;
      });
      inputEl.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          sendMessage(inputId, containerId);
        }
      });
    }

    if (sendBtn && !sendBtn.dataset.bound) {
      sendBtn.dataset.bound = 'true';
      sendBtn.addEventListener('click', () => sendMessage(inputId, containerId));
    }

    document.querySelectorAll('.quick-prompt').forEach((chip) => {
      if (chip.dataset.bound) return;
      chip.dataset.bound = 'true';
      chip.addEventListener('click', () => {
        if (inputEl) inputEl.value = chip.dataset.prompt || '';
        sendMessage(inputId, containerId);
      });
    });
  }

  function clearHistory() {
    conversationHistory = [];
  }

  return { init, sendMessage, clearHistory };
})();
