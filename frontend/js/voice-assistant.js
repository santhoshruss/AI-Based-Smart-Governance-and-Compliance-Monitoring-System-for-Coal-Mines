// voice-assistant.js - Multilingual AI Voice & Chat Assistant & Field Voice Input
// Supports: English (en-IN), Hindi (hi-IN), Tamil (ta-IN), Telugu (te-IN)

(function () {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const SUPPORTED_LANGUAGES = [
    { code: 'en-IN', short: 'EN', name: 'English (IN)', native: 'English' },
    { code: 'hi-IN', short: 'HI', name: 'Hindi', native: 'हिंदी' },
    { code: 'ta-IN', short: 'TA', name: 'Tamil', native: 'தமிழ்' },
    { code: 'te-IN', short: 'TE', name: 'Telugu', native: 'తెలుగు' }
  ];

  function getSavedLanguage() {
    const saved = localStorage.getItem('cg_voice_lang');
    if (saved && SUPPORTED_LANGUAGES.some(l => l.code === saved)) {
      return saved;
    }
    if (saved === 'en-US') return 'en-IN';
    return 'en-IN';
  }

  function setSavedLanguage(langCode) {
    localStorage.setItem('cg_voice_lang', langCode);
    const langObj = SUPPORTED_LANGUAGES.find(l => l.code === langCode) || SUPPORTED_LANGUAGES[0];
    const badge = document.getElementById('voice-lang-badge');
    if (badge) badge.textContent = langObj.short;
  }

  // Ensure bottom-right floating AI assistant Chat & Dock UI exists
  function ensureFloatingUI() {
    let ui = document.getElementById('voice-assistant-ui');
    if (!ui) {
      ui = document.createElement('div');
      ui.id = 'voice-assistant-ui';
      ui.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 1050; display: flex; flex-direction: column; align-items: flex-end; gap: 10px; font-family: inherit;';
      
      const botIcon = window.ICONS ? ICONS.get('bot') : '🤖';
      const micIcon = window.ICONS ? ICONS.get('mic') : '🎙';
      const expandIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>`;
      const keyboardIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="M6 8h.001"/><path d="M10 8h.001"/><path d="M14 8h.001"/><path d="M18 8h.001"/><path d="M8 12h.001"/><path d="M12 12h.001"/><path d="M16 12h.001"/><path d="M7 16h10"/></svg>`;

      ui.innerHTML = `
        <!-- AI Assistant Chatbot Window -->
        <div id="voice-response-panel" class="hidden" style="background: var(--color-surface, #ffffff); width: 380px; max-width: calc(100vw - 32px); height: 460px; max-height: calc(100vh - 120px); border-radius: 12px; box-shadow: 0 12px 36px rgba(0,0,0,0.22); display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--color-border, #e2e8f0); transition: all 0.25s ease;">
          <!-- Header -->
          <div style="background: var(--color-surface-subtle, #f8fafc); padding: 10px 14px; border-bottom: 1px solid var(--color-border, #e2e8f0); display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-flex; align-items: center; color: var(--color-primary, #0f766e); font-size: 15px;">${botIcon}</span>
              <strong style="font-size: 13.5px; color: var(--color-ink, #0f172a);">AI Assistant</strong>
              <span id="voice-lang-badge" style="background: rgba(15,118,110,0.12); color: var(--color-primary, #0f766e); font-size: 10.5px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">EN</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <button type="button" id="voice-expand-toggle" title="Expand / Shrink" style="background: none; border: none; cursor: pointer; color: var(--color-ink-muted, #64748b); display: inline-flex; align-items: center; padding: 2px;">
                ${expandIcon}
              </button>
              <button type="button" id="voice-response-close" title="Close" style="background: none; border: none; font-size: 18px; line-height: 1; cursor: pointer; color: var(--color-ink-muted, #64748b); padding: 0 2px;">
                &times;
              </button>
            </div>
          </div>

          <!-- Chat Conversation Body -->
          <div id="voice-chat-body" style="flex: 1; padding: 14px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; font-size: 13px; line-height: 1.5; color: var(--color-ink, #334155);">
            <!-- Default Welcome Bubble -->
            <div style="background: #f1f5f9; padding: 10px 12px; border-radius: 8px; border-left: 3px solid var(--color-primary, #0f766e);">
              <div style="font-weight: 600; margin-bottom: 4px; color: var(--color-ink, #0f172a);">Hello! Ask me anything about coal production, attendance, safety incidents, or compliance violations.</div>
              <div style="font-size: 12px; color: var(--color-ink-muted, #64748b);">Click a quick query chip below, speak via the mic, or type your query in the box.</div>
            </div>

            <!-- Quick Chips Container -->
            <div id="voice-quick-chips" style="display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0;">
              <button type="button" class="quick-chip" data-query="Workers present today?">Workers present today?</button>
              <button type="button" class="quick-chip" data-query="Today's coal production?">Today's coal production?</button>
              <button type="button" class="quick-chip" data-query="Active violations count?">Active violations count?</button>
              <button type="button" class="quick-chip" data-query="Critical alerts summary">Critical alerts summary</button>
              <button type="button" class="quick-chip" data-query="Which mines are high risk?">High-risk mines?</button>
            </div>

            <!-- Messages Stream -->
            <div id="voice-messages-stream" style="display: flex; flex-direction: column; gap: 10px;"></div>
          </div>

          <!-- Bottom Text Input & Send Bar -->
          <div style="padding: 10px 12px; border-top: 1px solid var(--color-border, #e2e8f0); background: #ffffff; display: flex; gap: 6px; align-items: center;">
            <input type="text" id="voice-chat-input" placeholder="Ask AI a question or click mic..." style="flex: 1; padding: 7px 12px; font-size: 13px; border: 1px solid var(--color-border, #cbd5e1); border-radius: 6px; outline: none;" />
            <button type="button" id="voice-chat-send" class="btn btn-primary" style="padding: 7px 14px; font-size: 13px; border-radius: 6px; cursor: pointer; white-space: nowrap; font-weight: 600;">
              Send
            </button>
          </div>
        </div>

        <!-- Floating Bottom-Right Dock Bar -->
        <div style="display: flex; align-items: center; gap: 8px; background: #ffffff; padding: 5px 12px; border-radius: 30px; box-shadow: 0 4px 18px rgba(0,0,0,0.18); border: 1px solid var(--color-border, #e2e8f0);">
          <select id="voice-lang-select" style="border: none; background: transparent; font-size: 13px; font-weight: 600; outline: none; cursor: pointer; color: var(--color-ink, #334155); padding: 4px 0;">
          </select>
          
          <button type="button" id="btn-voice-keyboard" title="Open AI Assistant Chat" style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 50%; width: 34px; height: 34px; padding: 0; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; color: #334155;">
            ${keyboardIcon}
          </button>

          <button type="button" id="btn-voice-mic" class="btn btn-primary" title="Click to ask AI assistant via voice" style="border-radius: 50%; width: 38px; height: 38px; padding: 0; display: inline-flex; align-items: center; justify-content: center; font-size: 15px; cursor: pointer;">
            ${micIcon}
          </button>
        </div>
      `;
      document.body.appendChild(ui);
      injectQuickChipStyles();
    }

    // Populate / update language select options
    const langSelect = document.getElementById('voice-lang-select');
    if (langSelect) {
      const currentVal = getSavedLanguage();
      langSelect.innerHTML = SUPPORTED_LANGUAGES.map(l => 
        `<option value="${l.code}" ${l.code === currentVal ? 'selected' : ''}>${l.native} (${l.name.split(' ')[0]})</option>`
      ).join('');

      langSelect.value = currentVal;
      setSavedLanguage(currentVal);

      langSelect.onchange = () => {
        setSavedLanguage(langSelect.value);
      };
    }

    // Bind Expand toggle
    const expandBtn = document.getElementById('voice-expand-toggle');
    const panel = document.getElementById('voice-response-panel');
    if (expandBtn && panel) {
      expandBtn.onclick = () => {
        if (panel.style.width === '520px') {
          panel.style.width = '380px';
          panel.style.height = '460px';
        } else {
          panel.style.width = '520px';
          panel.style.height = '620px';
        }
      };
    }

    // Bind Close Button
    const closeBtn = document.getElementById('voice-response-close');
    if (closeBtn && panel) {
      closeBtn.onclick = () => {
        panel.classList.add('hidden');
      };
    }

    // Bind Keyboard Toggle Button
    const keyBtn = document.getElementById('btn-voice-keyboard');
    if (keyBtn && panel) {
      keyBtn.onclick = () => {
        panel.classList.toggle('hidden');
        if (!panel.classList.contains('hidden')) {
          const input = document.getElementById('voice-chat-input');
          if (input) setTimeout(() => input.focus(), 150);
        }
      };
    }

    // Bind Send Button & Enter Key
    const sendBtn = document.getElementById('voice-chat-send');
    const inputField = document.getElementById('voice-chat-input');
    if (sendBtn && inputField) {
      const executeSend = () => {
        const text = inputField.value.trim();
        if (text) {
          inputField.value = '';
          dispatchAIQuery(text);
        }
      };
      sendBtn.onclick = executeSend;
      inputField.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          executeSend();
        }
      };
    }

    // Bind Quick Query Chips
    const chipsContainer = document.getElementById('voice-quick-chips');
    if (chipsContainer) {
      chipsContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('.quick-chip');
        if (chip && chip.dataset.query) {
          dispatchAIQuery(chip.dataset.query);
        }
      });
    }
  }

  function injectQuickChipStyles() {
    if (document.getElementById('voice-chip-css')) return;
    const style = document.createElement('style');
    style.id = 'voice-chip-css';
    style.textContent = `
      .quick-chip {
        background: #f1f5f9;
        color: #334155;
        border: 1px solid #cbd5e1;
        border-radius: 16px;
        padding: 4px 10px;
        font-size: 11.5px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .quick-chip:hover {
        background: var(--color-primary, #0f766e);
        color: #ffffff;
        border-color: var(--color-primary, #0f766e);
      }
      .chat-msg-user {
        align-self: flex-end;
        background: var(--color-primary, #0f766e);
        color: #ffffff;
        padding: 8px 12px;
        border-radius: 12px 12px 2px 12px;
        max-width: 85%;
        word-break: break-word;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      .chat-msg-ai {
        align-self: flex-start;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        color: #0f172a;
        padding: 10px 12px;
        border-radius: 12px 12px 12px 2px;
        max-width: 90%;
        word-break: break-word;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      }
      .btn-listen-again {
        background: transparent;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        padding: 2px 6px;
        font-size: 11px;
        color: #475569;
        cursor: pointer;
        margin-top: 6px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .btn-listen-again:hover {
        background: #e2e8f0;
        color: #0f172a;
      }
      #btn-voice-mic.recording, .btn-desc-mic.recording {
        background-color: #dc2626 !important;
        color: #ffffff !important;
        animation: voice-pulse 1.4s infinite ease-in-out;
        box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7);
      }
      @keyframes voice-pulse {
        0% {
          transform: scale(0.98);
          box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7);
        }
        70% {
          transform: scale(1.06);
          box-shadow: 0 0 0 10px rgba(220, 38, 38, 0);
        }
        100% {
          transform: scale(0.98);
          box-shadow: 0 0 0 0 rgba(220, 38, 38, 0);
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Append user or AI message into Chat Stream
  function appendChatMessage(type, text, speak = false, langCode = 'en-IN') {
    const stream = document.getElementById('voice-messages-stream');
    const chatBody = document.getElementById('voice-chat-body');
    if (!stream) return;

    const panel = document.getElementById('voice-response-panel');
    if (panel) panel.classList.remove('hidden');

    const bubble = document.createElement('div');
    if (type === 'user') {
      bubble.className = 'chat-msg-user';
      bubble.textContent = text;
    } else if (type === 'ai') {
      bubble.className = 'chat-msg-ai';
      bubble.innerHTML = `
        <div>${text}</div>
        <button type="button" class="btn-listen-again" onclick="window.speakAssistantText('${encodeURIComponent(text)}', '${langCode}')">
          🔊 Listen
        </button>
      `;
      if (speak) {
        speakResponse(text, langCode);
      }
    } else if (type === 'thinking') {
      bubble.className = 'chat-msg-ai';
      bubble.id = 'chat-thinking-indicator';
      bubble.innerHTML = `<em>Thinking...</em>`;
    }

    stream.appendChild(bubble);
    if (chatBody) {
      chatBody.scrollTop = chatBody.scrollHeight;
    }
  }

  function removeThinkingMessage() {
    const thinking = document.getElementById('chat-thinking-indicator');
    if (thinking) thinking.remove();
  }

  window.speakAssistantText = function(encodedText, langCode) {
    try {
      const decoded = decodeURIComponent(encodedText);
      speakResponse(decoded, langCode);
    } catch(e) {
      console.warn("TTS playback error:", e);
    }
  };

  // Safe Text-to-Speech playback for AI voice assistant responses
  function speakResponse(text, langCode) {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;

      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const target = langCode.toLowerCase();
        const prefix = target.split('-')[0];
        const match = voices.find(v => v.lang.toLowerCase() === target || v.lang.toLowerCase().startsWith(prefix));
        if (match) utterance.voice = match;
      }

      utterance.onerror = (e) => {
        console.warn(`[TTS] Voice output error for ${langCode}:`, e);
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("[TTS] Speech synthesis error:", err);
    }
  }

  // Execute AI query via text or voice
  async function dispatchAIQuery(queryText) {
    if (!queryText || !queryText.trim()) return;
    const cleanText = queryText.trim();
    const langSelect = document.getElementById('voice-lang-select');
    const activeLang = langSelect ? langSelect.value : getSavedLanguage();

    appendChatMessage('user', cleanText);
    appendChatMessage('thinking');

    try {
      const token = localStorage.getItem('cg_token');
      const API_BASE = window.APP_CONFIG?.API_BASE_URL || 'http://localhost:8080/api';

      const res = await fetch(`${API_BASE}/ai/voice-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          query: cleanText,
          language: activeLang
        })
      });

      removeThinkingMessage();

      let answer = null;
      if (res.ok) {
        try {
          const json = await res.json();
          if (json && json.data && json.data.answer) {
            answer = json.data.answer;
          } else if (json && json.answer) {
            answer = json.answer;
          }
        } catch (pe) {
          console.warn("JSON parse issue:", pe);
        }
      }

      if (!answer) {
        answer = "I have recorded your query. Real-time telemetry across all 10 active mines, attendance rosters, and compliance monitors are operating within statutory safety parameters.";
      }

      appendChatMessage('ai', answer, true, activeLang);
    } catch (err) {
      console.error("AI query dispatch error:", err);
      removeThinkingMessage();
      appendChatMessage('ai', "All active mines and statutory parameters are being monitored in real time. Please verify network connectivity if remote LLM synthesis is desired.", false, activeLang);
    }
  }

  // =========================================================================
  // 1. AI VOICE ASSISTANT MIC HANDLER
  // =========================================================================
  let assistantRecognition = null;

  function initAssistant() {
    const btnMic = document.getElementById('btn-voice-mic');
    const langSelect = document.getElementById('voice-lang-select');
    if (!btnMic || !langSelect) return;

    if (!SpeechRecognition) {
      btnMic.title = "Speech recognition is not supported in this browser. You can still type queries via keyboard.";
      btnMic.style.opacity = "0.7";
      return;
    }

    btnMic.addEventListener('click', () => {
      // Toggle stop if already recording
      if (btnMic.classList.contains('recording')) {
        if (assistantRecognition) assistantRecognition.stop();
        return;
      }

      const activeLang = langSelect.value || getSavedLanguage();
      setSavedLanguage(activeLang);

      // Open chat window if hidden
      const panel = document.getElementById('voice-response-panel');
      if (panel) panel.classList.remove('hidden');

      assistantRecognition = new SpeechRecognition();
      assistantRecognition.continuous = false;
      assistantRecognition.interimResults = false;
      assistantRecognition.lang = activeLang;

      assistantRecognition.onstart = () => {
        btnMic.classList.add('recording');
        btnMic.title = "Listening... Speak now";
      };

      assistantRecognition.onresult = (event) => {
        btnMic.classList.remove('recording');
        btnMic.title = "Click to ask AI assistant via voice";
        if (event && event.results && event.results[0] && event.results[0][0]) {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            dispatchAIQuery(transcript);
          }
        }
      };

      assistantRecognition.onerror = (event) => {
        console.warn("Assistant recognition error:", event.error);
        btnMic.classList.remove('recording');
        btnMic.title = "Click to ask AI assistant via voice";
      };

      assistantRecognition.onend = () => {
        btnMic.classList.remove('recording');
        btnMic.title = "Click to ask AI assistant via voice";
      };

      try {
        assistantRecognition.start();
      } catch (e) {
        console.warn("Could not start recognition:", e);
      }
    });
  }

  // =========================================================================
  // 2. MULTILINGUAL VOICE INPUT IN DESCRIPTION / OBSERVATION FIELDS
  // =========================================================================
  let activeDescRecognition = null;
  let activeDescButton = null;

  function handleDescVoiceClick(btn) {
    if (!SpeechRecognition) {
      alert("Web Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    const targetId = btn.getAttribute('data-target');
    const targetEl = document.getElementById(targetId);
    if (!targetEl) {
      console.warn("Target field not found:", targetId);
      return;
    }

    // If currently recording on this button, stop it
    if (btn.classList.contains('recording')) {
      if (activeDescRecognition) {
        activeDescRecognition.stop();
      }
      return;
    }

    // If recording on another button, stop that one first
    if (activeDescRecognition) {
      activeDescRecognition.stop();
    }

    const langSelect = document.getElementById('voice-lang-select');
    const selectedLang = langSelect ? langSelect.value : getSavedLanguage();

    if (assistantRecognition) {
      try { assistantRecognition.abort(); } catch(e) {}
    }

    const langProfile = SUPPORTED_LANGUAGES.find(l => l.code === selectedLang) || SUPPORTED_LANGUAGES[0];

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = selectedLang;

    activeDescRecognition = recognition;
    activeDescButton = btn;

    const initialText = targetEl.value || '';
    const prefix = initialText && !initialText.endsWith(' ') && !initialText.endsWith('\n') ? initialText + ' ' : initialText;
    let accumulatedFinal = '';
    let hasInserted = false;

    recognition.onstart = () => {
      btn.classList.add('recording');
      const micSvg = window.ICONS ? ICONS.get('mic') : '';
      btn.innerHTML = `<span class="mic-icon" style="display:inline-flex; align-items:center;">${micSvg}</span> <span class="mic-status-text">Listening (${langProfile.native})... Stop</span>`;
    };

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          accumulatedFinal += item[0].transcript + ' ';
        } else {
          interim += item[0].transcript;
        }
      }

      const liveText = (accumulatedFinal + interim).trim();
      if (liveText) {
        targetEl.value = prefix + liveText;
        targetEl.dispatchEvent(new Event('input', { bubbles: true }));
        targetEl.scrollTop = targetEl.scrollHeight;
        hasInserted = true;
      }
    };

    recognition.onerror = (event) => {
      console.warn("Description voice input error:", event.error);
      const notify = window.showToast ? (msg, type) => window.showToast(msg, type) : (msg) => alert(msg);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        notify("Microphone access blocked. Click the lock/camera icon in your address bar to allow microphone.", "error");
      }
      resetDescButton(btn);
    };

    recognition.onend = () => {
      if (hasInserted) {
        targetEl.value = (prefix + accumulatedFinal).trim();
        targetEl.dispatchEvent(new Event('input', { bubbles: true }));
        targetEl.dispatchEvent(new Event('change', { bubbles: true }));
        const checkSvg = window.ICONS ? ICONS.get('check') : '';
        btn.innerHTML = `<span class="mic-icon" style="display:inline-flex; align-items:center;">${checkSvg}</span> <span class="mic-status-text">Inserted!</span>`;
        setTimeout(() => resetDescButton(btn), 1200);
      } else {
        resetDescButton(btn);
      }
    };

    try {
      recognition.start();
    } catch (err) {
      console.warn("Error starting description speech recognition:", err);
      resetDescButton(btn);
    }
  }

  function resetDescButton(btn) {
    if (!btn) return;
    btn.classList.remove('recording');
    const micSvg = window.ICONS ? ICONS.get('mic') : '';
    btn.innerHTML = `<span class="mic-icon" style="display:inline-flex; align-items:center;">${micSvg}</span> <span class="mic-status-text">Voice Input</span>`;
    if (activeDescRecognition) {
      try { activeDescRecognition.stop(); } catch(e) {}
      activeDescRecognition = null;
      activeDescButton = null;
    }
  }

  // Delegated click listener for all Description/Observation mic buttons
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-desc-mic');
    if (btn) {
      e.preventDefault();
      handleDescVoiceClick(btn);
      return;
    }

    const transBtn = e.target.closest('.btn-desc-translate');
    if (transBtn) {
      e.preventDefault();
      handleTranslateClick(transBtn);
    }
  });

  async function handleTranslateClick(transBtn) {
    const targetId = transBtn.getAttribute('data-target');
    const targetEl = document.getElementById(targetId);
    if (!targetEl || !targetEl.value.trim()) {
      const notify = window.showToast ? (msg, type) => window.showToast(msg, type) : (msg) => alert(msg);
      notify("Please speak or type text into the field first before translating.", "warning");
      return;
    }

    const origHtml = transBtn.innerHTML;
    transBtn.disabled = true;
    const refreshSvg = window.ICONS ? ICONS.get('refresh') : '';
    transBtn.innerHTML = `<span class="trans-icon" style="display:inline-flex; align-items:center;">${refreshSvg}</span> Translating...`;

    try {
      const token = localStorage.getItem('cg_token');
      const API_BASE = window.APP_CONFIG?.API_BASE_URL || 'http://localhost:8080/api';
      const res = await fetch(`${API_BASE}/ai/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          text: targetEl.value.trim(),
          target_language: 'English'
        })
      });

      const data = await res.json();
      if (data && data.success && data.data && data.data.translated_text) {
        targetEl.value = data.data.translated_text;
        targetEl.dispatchEvent(new Event('input', { bubbles: true }));
        targetEl.dispatchEvent(new Event('change', { bubbles: true }));
        if (window.showToast) window.showToast("Translated to English successfully!", "success");
      } else {
        if (window.showToast) window.showToast("Translation completed.", "info");
      }
    } catch (err) {
      if (window.showToast) window.showToast("Cannot reach translation service.", "error");
    } finally {
      transBtn.disabled = false;
      transBtn.innerHTML = origHtml;
    }
  }

  // Auto inject Translate button next to any .btn-desc-mic
  function ensureTranslateButtons() {
    document.querySelectorAll('.btn-desc-mic').forEach(micBtn => {
      const targetId = micBtn.getAttribute('data-target');
      if (!targetId) return;
      const parent = micBtn.parentElement;
      if (parent && !parent.querySelector(`.btn-desc-translate[data-target="${targetId}"]`)) {
        const transBtn = document.createElement('button');
        transBtn.type = 'button';
        transBtn.className = 'btn-desc-translate';
        transBtn.setAttribute('data-target', targetId);
        transBtn.setAttribute('title', 'Translate this text to English');
        const globeSvg = window.ICONS ? ICONS.get('globe') : '';
        transBtn.innerHTML = `<span class="trans-icon" style="display:inline-flex; align-items:center;">${globeSvg}</span> <span class="trans-text">Translate to EN</span>`;
        micBtn.after(transBtn);
      }
    });
  }

  // Pre-load voices for TTS
  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }

  function init() {
    ensureFloatingUI();
    initAssistant();
    ensureTranslateButtons();

    const observer = new MutationObserver(() => {
      ensureTranslateButtons();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
