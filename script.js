/* =============================================================
   MedAI — Medical Q&A Assistant
   script.js
   Vanilla JS behavior layer. No external libraries.
   No backend calls — fetchAIResponse() below is the single
   function to swap for a real Django API call later.
============================================================= */

(function () {
  'use strict';

  /* -----------------------------------------------------------
     0. STATE
  ----------------------------------------------------------- */
  const state = {
    theme: 'system', // 'light' | 'dark' | 'system'
    enterToSend: true,
    showSources: true,
    isSending: false,
    activeConversationId: null
  };

  const MOBILE_BREAKPOINT = 768;

  /* -----------------------------------------------------------
     1. DOM REFERENCES
  ----------------------------------------------------------- */
  const dom = {};

  function cacheDom() {
    dom.navbar = document.getElementById('navbar');
    dom.mobileMenuButton = document.getElementById('mobileMenuButton');
    dom.navLinks = document.getElementById('navLinks');
    dom.themeToggle = document.getElementById('themeToggle');
    dom.navAskButton = document.getElementById('navAskButton');

    dom.heroAskButton = document.getElementById('heroAskButton');

    dom.chatSidebar = document.getElementById('chatSidebar');
    dom.newChatButton = document.getElementById('newChatButton');
    dom.conversationSearch = document.getElementById('conversationSearch');
    dom.conversationList = document.getElementById('conversationList');
    dom.settingsButton = document.getElementById('settingsButton');
    dom.sidebarCollapse = document.getElementById('sidebarCollapse');
    dom.profileButton = document.getElementById('profileButton');

    dom.chatHeader = document.getElementById('chatHeader');
    dom.chatStatus = document.getElementById('chatStatus');
    dom.clearChatButton = document.getElementById('clearChatButton');
    dom.mobileSidebarButton = document.getElementById('mobileSidebarButton');

    dom.welcomeScreen = document.getElementById('welcomeScreen');
    dom.quickQuestions = document.getElementById('quickQuestions');

    dom.chatMessages = document.getElementById('chatMessages');
    dom.typingIndicator = document.getElementById('typingIndicator');

    dom.chatInputForm = document.querySelector('.chat-input-form');
    dom.chatInput = document.getElementById('chatInput');
    dom.sendButton = document.getElementById('sendButton');
    dom.clearInputButton = document.getElementById('clearInputButton');
    dom.characterCount = document.getElementById('characterCount');

    dom.emergencyAlert = document.getElementById('emergencyAlert');

    dom.settingsModal = document.getElementById('settingsModal');
    dom.settingsModalClose = document.getElementById('settingsModalClose');
    dom.themeLight = document.getElementById('themeLight');
    dom.themeDark = document.getElementById('themeDark');
    dom.themeSystem = document.getElementById('themeSystem');
    dom.enterToSendToggle = document.getElementById('enterToSend');
    dom.showSourcesToggle = document.getElementById('showSources');

    dom.profileMenu = document.getElementById('profileMenu');

    dom.notificationContainer = document.getElementById('notificationContainer');
  }

  /* -----------------------------------------------------------
     2. UTILITIES
  ----------------------------------------------------------- */
  function qsa(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  function formatTime(date) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function isMobileViewport() {
    return window.matchMedia('(max-width: ' + MOBILE_BREAKPOINT + 'px)').matches;
  }

  function safeStorageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (err) {
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (err) {
      /* Storage unavailable — fail silently, theme just won't persist. */
    }
  }

  /* -----------------------------------------------------------
     3. MOBILE NAVBAR MENU
  ----------------------------------------------------------- */
  function initMobileNav() {
    if (!dom.mobileMenuButton || !dom.navLinks) return;

    dom.mobileMenuButton.addEventListener('click', function () {
      const isOpen = dom.navLinks.classList.toggle('is-open');
      dom.mobileMenuButton.setAttribute('aria-expanded', String(isOpen));
      dom.mobileMenuButton.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    });

    qsa('.nav-link', dom.navLinks).forEach(function (link) {
      link.addEventListener('click', function () {
        dom.navLinks.classList.remove('is-open');
        dom.mobileMenuButton.setAttribute('aria-expanded', 'false');
        dom.mobileMenuButton.setAttribute('aria-label', 'Open menu');
      });
    });

    document.addEventListener('click', function (event) {
      if (!dom.navLinks.classList.contains('is-open')) return;
      const clickedInsideNav = dom.navbar.contains(event.target);
      if (!clickedInsideNav) {
        dom.navLinks.classList.remove('is-open');
        dom.mobileMenuButton.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* -----------------------------------------------------------
     4. SMOOTH SCROLLING (anchor links, header-offset aware)
  ----------------------------------------------------------- */
  function initSmoothScroll() {
    qsa('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (event) {
        const targetId = anchor.getAttribute('href');
        if (!targetId || targetId === '#') return;

        const target = document.querySelector(targetId);
        if (!target) return;

        event.preventDefault();

        const headerOffset = dom.navbar ? dom.navbar.offsetHeight : 0;
        const targetTop = target.getBoundingClientRect().top + window.pageYOffset - headerOffset - 12;

        window.scrollTo({ top: targetTop, behavior: 'smooth' });
      });
    });
  }

  /* -----------------------------------------------------------
     5. THEME TOGGLE (light / dark / system)
  ----------------------------------------------------------- */
  function applyTheme(theme) {
    state.theme = theme;

    let resolved = theme;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      resolved = prefersDark ? 'dark' : 'light';
    }

    document.documentElement.setAttribute('data-theme', resolved);

    if (dom.themeToggle) {
      dom.themeToggle.setAttribute('aria-pressed', String(resolved === 'dark'));
    }

    safeStorageSet('medai-theme', theme);
  }

  function initTheme() {
    const stored = safeStorageGet('medai-theme');
    applyTheme(stored || 'system');

    if (dom.themeLight) dom.themeLight.checked = state.theme === 'light';
    if (dom.themeDark) dom.themeDark.checked = state.theme === 'dark';
    if (dom.themeSystem) dom.themeSystem.checked = state.theme === 'system' || !stored;

    if (dom.themeToggle) {
      dom.themeToggle.addEventListener('click', function () {
        const resolved = document.documentElement.getAttribute('data-theme');
        const next = resolved === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        if (dom.themeLight) dom.themeLight.checked = next === 'light';
        if (dom.themeDark) dom.themeDark.checked = next === 'dark';
        if (dom.themeSystem) dom.themeSystem.checked = false;
      });
    }

    [dom.themeLight, dom.themeDark, dom.themeSystem].forEach(function (radio) {
      if (!radio) return;
      radio.addEventListener('change', function () {
        if (radio.checked) applyTheme(radio.value);
      });
    });

    const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = function () {
      if (state.theme === 'system') applyTheme('system');
    };
    if (darkMediaQuery.addEventListener) {
      darkMediaQuery.addEventListener('change', handleSystemChange);
    } else if (darkMediaQuery.addListener) {
      darkMediaQuery.addListener(handleSystemChange);
    }
  }

  /* -----------------------------------------------------------
     6. NOTIFICATIONS
  ----------------------------------------------------------- */
  const NOTIFICATION_ICONS = {
    success: 'lucide-check-circle',
    error: 'lucide-alert-circle',
    warning: 'lucide-triangle-alert',
    info: 'lucide-info'
  };

  function showNotification(message, type) {
    if (!dom.notificationContainer) return;

    const kind = NOTIFICATION_ICONS[type] ? type : 'info';
    const notification = document.createElement('div');
    notification.className = 'notification notification-' + kind;
    notification.setAttribute('role', 'status');

    const icon = document.createElement('i');
    icon.className = 'lucide ' + NOTIFICATION_ICONS[kind];
    icon.setAttribute('aria-hidden', 'true');

    const text = document.createElement('span');
    text.textContent = message;

    notification.appendChild(icon);
    notification.appendChild(text);
    dom.notificationContainer.appendChild(notification);

    window.setTimeout(function () {
      notification.style.transition = 'opacity 220ms ease, transform 220ms ease';
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(16px)';
      window.setTimeout(function () {
        if (notification.parentNode) notification.parentNode.removeChild(notification);
      }, 220);
    }, 4000);
  }

  /* -----------------------------------------------------------
     7. EMERGENCY ALERT
  ----------------------------------------------------------- */
  const EMERGENCY_KEYWORDS = [
    'suicide', 'kill myself', 'end my life', 'chest pain', "can't breathe",
    'cannot breathe', 'not breathing', 'severe bleeding', 'heavy bleeding',
    'overdose', 'heart attack', 'stroke', 'unconscious', 'unresponsive',
    'severe allergic reaction', 'anaphylaxis'
  ];

  function containsEmergencyLanguage(message) {
    const lower = message.toLowerCase();
    return EMERGENCY_KEYWORDS.some(function (keyword) {
      return lower.indexOf(keyword) !== -1;
    });
  }

  function showEmergencyAlert() {
    if (!dom.emergencyAlert) return;
    dom.emergencyAlert.hidden = false;
    dom.emergencyAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideEmergencyAlert() {
    if (!dom.emergencyAlert) return;
    dom.emergencyAlert.hidden = true;
  }

  function initEmergencyAlert() {
    if (!dom.emergencyAlert) return;
    const closeButton = dom.emergencyAlert.querySelector('.emergency-alert-close');
    if (closeButton) {
      closeButton.addEventListener('click', hideEmergencyAlert);
    }
  }

  /* -----------------------------------------------------------
     8. CHAT SIDEBAR (mobile off-canvas + collapse)
  ----------------------------------------------------------- */
  function openSidebar() {
    if (!dom.chatSidebar) return;
    dom.chatSidebar.style.display = '';
    if (isMobileViewport()) {
      dom.chatSidebar.classList.add('is-open');
    }
    if (dom.mobileSidebarButton) dom.mobileSidebarButton.setAttribute('aria-expanded', 'true');
  }

  function closeSidebar() {
    if (!dom.chatSidebar) return;
    if (isMobileViewport()) {
      dom.chatSidebar.classList.remove('is-open');
    } else {
      dom.chatSidebar.style.display = 'none';
    }
    if (dom.mobileSidebarButton) dom.mobileSidebarButton.setAttribute('aria-expanded', 'false');
  }

  function toggleSidebar() {
    if (!dom.chatSidebar) return;
    const currentlyOpen = isMobileViewport()
      ? dom.chatSidebar.classList.contains('is-open')
      : dom.chatSidebar.style.display !== 'none';

    if (currentlyOpen) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  function initChatSidebar() {
    if (dom.mobileSidebarButton) {
      dom.mobileSidebarButton.addEventListener('click', toggleSidebar);
    }
    if (dom.sidebarCollapse) {
      dom.sidebarCollapse.addEventListener('click', toggleSidebar);
    }

    document.addEventListener('click', function (event) {
      if (!isMobileViewport()) return;
      if (!dom.chatSidebar || !dom.chatSidebar.classList.contains('is-open')) return;

      const clickedInsideSidebar = dom.chatSidebar.contains(event.target);
      const clickedToggleButton =
        (dom.mobileSidebarButton && dom.mobileSidebarButton.contains(event.target)) ||
        (dom.sidebarCollapse && dom.sidebarCollapse.contains(event.target));

      if (!clickedInsideSidebar && !clickedToggleButton) {
        closeSidebar();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && isMobileViewport()) {
        closeSidebar();
      }
    });

    window.addEventListener('resize', function () {
      if (!dom.chatSidebar) return;
      if (!isMobileViewport()) {
        dom.chatSidebar.classList.remove('is-open');
        if (dom.chatSidebar.style.display === 'none') {
          dom.chatSidebar.style.display = 'none';
        } else {
          dom.chatSidebar.style.display = '';
        }
      } else {
        dom.chatSidebar.style.display = '';
      }
    });
  }

  /* -----------------------------------------------------------
     9. CONVERSATION LIST (search + selection)
  ----------------------------------------------------------- */
  const SAMPLE_CONVERSATIONS = {
    'what are symptoms of diabetes?': {
      question: 'What are symptoms of diabetes?',
      answer:
        'Common symptoms associated with diabetes can include increased thirst, frequent urination, ' +
        'fatigue, blurred vision, and slow-healing wounds. Symptoms can vary between individuals and ' +
        'diabetes types, so a healthcare professional should evaluate any specific concerns.',
      sources: ['medical-document.pdf', 'medical-reference.pdf']
    },
    'how does hypertension occur?': {
      question: 'How does hypertension occur?',
      answer:
        'Hypertension develops when the force of blood against artery walls stays consistently elevated. ' +
        'Contributing factors can include genetics, diet, physical activity levels, stress, and certain ' +
        'underlying health conditions. A healthcare professional can help identify personal risk factors.',
      sources: ['medical-reference.pdf']
    },
    'explain vitamin deficiency': {
      question: 'Explain vitamin deficiency',
      answer:
        'A vitamin deficiency happens when the body does not get or absorb enough of a particular vitamin ' +
        'to function normally. This can result from limited dietary intake, absorption issues, or increased ' +
        'bodily needs, and may lead to a range of symptoms depending on which vitamin is involved.',
      sources: ['medical-document.pdf']
    },
    'what causes headaches?': {
      question: 'What causes headaches?',
      answer:
        'Headaches can be triggered by a wide range of factors including dehydration, stress, poor sleep, ' +
        'eye strain, skipped meals, and tension in the neck or shoulders. Frequent or severe headaches ' +
        'are worth discussing with a healthcare professional.',
      sources: ['medical-reference.pdf', 'medical-document.pdf']
    }
  };

  function initConversationSearch() {
    if (!dom.conversationSearch || !dom.conversationList) return;

    dom.conversationSearch.addEventListener('input', function () {
      const query = dom.conversationSearch.value.trim().toLowerCase();
      qsa('.conversation-item', dom.conversationList).forEach(function (item) {
        const titleEl = item.querySelector('.conversation-title');
        const title = titleEl ? titleEl.textContent.toLowerCase() : '';
        item.style.display = title.indexOf(query) !== -1 ? '' : 'none';
      });
    });
  }

  function initConversationSelection() {
    if (!dom.conversationList) return;

    qsa('.conversation-button', dom.conversationList).forEach(function (button) {
      button.addEventListener('click', function () {
        const item = button.closest('.conversation-item');
        if (!item) return;

        qsa('.conversation-item', dom.conversationList).forEach(function (sibling) {
          sibling.classList.remove('conversation-item-active');
        });
        item.classList.add('conversation-item-active');

        const titleEl = button.querySelector('.conversation-title');
        const title = titleEl ? titleEl.textContent.trim() : '';
        loadSampleConversation(title);

        if (isMobileViewport()) {
          closeSidebar();
        }
      });
    });
  }

  function loadSampleConversation(title) {
    const key = title.toLowerCase();
    const conversation = SAMPLE_CONVERSATIONS[key];

    clearMessagesFromDom();
    hideWelcomeScreen();

    if (!conversation) {
      showNotification('Could not load that conversation.', 'error');
      showWelcomeScreen();
      return;
    }

    appendMessage('user', conversation.question);
    appendMessage('ai', conversation.answer, state.showSources ? conversation.sources : []);
  }

  /* -----------------------------------------------------------
     10. NEW CHAT / CLEAR CHAT
  ----------------------------------------------------------- */
  function showWelcomeScreen() {
    if (dom.welcomeScreen) dom.welcomeScreen.hidden = false;
  }

  function hideWelcomeScreen() {
    if (dom.welcomeScreen) dom.welcomeScreen.hidden = true;
  }

  function clearMessagesFromDom() {
    if (!dom.chatMessages) return;
    dom.chatMessages.innerHTML = '';
  }

  function startNewChat() {
    clearMessagesFromDom();
    showWelcomeScreen();
    hideEmergencyAlert();
    hideTypingIndicator();
    resetChatInput();

    qsa('.conversation-item', dom.conversationList).forEach(function (item) {
      item.classList.remove('conversation-item-active');
    });

    if (dom.chatStatus) {
      dom.chatStatus.querySelector('.status-text') ||
        (dom.chatStatus.lastChild && dom.chatStatus.lastChild.textContent);
    }

    if (isMobileViewport()) {
      closeSidebar();
    }
  }

  function initNewChat() {
    if (dom.newChatButton) {
      dom.newChatButton.addEventListener('click', startNewChat);
    }
    const headerNewChatButton = dom.chatHeader
      ? dom.chatHeader.querySelector('.chat-header-actions .button-ghost')
      : null;
    if (headerNewChatButton) {
      headerNewChatButton.addEventListener('click', startNewChat);
    }
  }

  function initClearChat() {
    if (!dom.clearChatButton) return;
    dom.clearChatButton.addEventListener('click', function () {
      clearMessagesFromDom();
      showWelcomeScreen();
      hideEmergencyAlert();
      hideTypingIndicator();
      showNotification('Chat cleared.', 'success');
    });
  }

  /* -----------------------------------------------------------
     11. QUICK QUESTIONS
  ----------------------------------------------------------- */
  function initQuickQuestions() {
    if (!dom.quickQuestions) return;

    qsa('.quick-question', dom.quickQuestions).forEach(function (button) {
      button.addEventListener('click', function () {
        const question = button.getAttribute('data-question');
        if (!question) return;
        submitUserMessage(question);
      });
    });
  }

  /* -----------------------------------------------------------
     12. CHAT INPUT (character counter, clear, resize, enter-to-send)
  ----------------------------------------------------------- */
  function updateCharacterCount() {
    if (!dom.chatInput || !dom.characterCount) return;
    const max = dom.chatInput.getAttribute('maxlength') || '1000';
    dom.characterCount.textContent = dom.chatInput.value.length + ' / ' + max;
  }

  function autoResizeInput() {
    if (!dom.chatInput) return;
    dom.chatInput.style.height = 'auto';
    dom.chatInput.style.height = Math.min(dom.chatInput.scrollHeight, 160) + 'px';
  }

  function resetChatInput() {
    if (!dom.chatInput) return;
    dom.chatInput.value = '';
    autoResizeInput();
    updateCharacterCount();
  }

  function initChatInput() {
    if (!dom.chatInput) return;

    dom.chatInput.addEventListener('input', function () {
      updateCharacterCount();
      autoResizeInput();
    });

    dom.chatInput.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter') return;

      if (event.shiftKey) {
        return; // Shift + Enter inserts a new line (default textarea behavior).
      }

      if (state.enterToSend) {
        event.preventDefault();
        handleSendFromInput();
      }
    });

    updateCharacterCount();
  }

  function initClearInput() {
    if (!dom.clearInputButton) return;
    dom.clearInputButton.addEventListener('click', function () {
      resetChatInput();
      dom.chatInput.focus();
    });
  }

  /* -----------------------------------------------------------
     13. MESSAGES (render + send flow)
  ----------------------------------------------------------- */
  function createMessageElement(role, text, sources) {
    const message = document.createElement('div');
    message.className = role === 'user' ? 'message message-user' : 'message message-ai';

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    if (role === 'user') {
      avatar.textContent = 'U';
    } else {
      const icon = document.createElement('i');
      icon.className = 'lucide lucide-bot';
      avatar.appendChild(icon);
    }

    const body = document.createElement('div');
    body.className = 'message-body';

    const meta = document.createElement('div');
    meta.className = 'message-meta';

    const sender = document.createElement('span');
    sender.className = 'message-sender';
    sender.textContent = role === 'user' ? 'You' : 'MedAI Assistant';

    const time = document.createElement('span');
    time.className = 'message-time';
    time.textContent = formatTime(new Date());

    meta.appendChild(sender);
    meta.appendChild(time);

    const content = document.createElement('div');
    content.className = 'message-content';
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    content.appendChild(paragraph);

    body.appendChild(meta);
    body.appendChild(content);

    if (role === 'ai' && sources && sources.length > 0 && state.showSources) {
      const sourcesWrapper = document.createElement('div');
      sourcesWrapper.className = 'message-sources';

      const heading = document.createElement('h3');
      heading.className = 'source-list-heading';
      heading.textContent = 'Sources';

      const list = document.createElement('ul');
      list.className = 'source-list';

      sources.forEach(function (sourceName) {
        const item = document.createElement('li');
        item.className = 'source-item';

        const icon = document.createElement('i');
        icon.className = 'lucide lucide-file-text';
        icon.setAttribute('aria-hidden', 'true');

        const title = document.createElement('span');
        title.className = 'source-title';
        title.textContent = sourceName;

        item.appendChild(icon);
        item.appendChild(title);
        list.appendChild(item);
      });

      sourcesWrapper.appendChild(heading);
      sourcesWrapper.appendChild(list);
      body.appendChild(sourcesWrapper);
    }

    message.appendChild(avatar);
    message.appendChild(body);

    return message;
  }

  function appendMessage(role, text, sources) {
    if (!dom.chatMessages) return null;
    const messageEl = createMessageElement(role, text, sources || []);
    dom.chatMessages.appendChild(messageEl);
    scrollMessagesToBottom();
    return messageEl;
  }

  function scrollMessagesToBottom() {
    if (!dom.chatMessages) return;
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
  }

  function showTypingIndicator() {
    if (!dom.typingIndicator) return;
    dom.typingIndicator.hidden = false;
    scrollMessagesToBottom();
  }

  function hideTypingIndicator() {
    if (!dom.typingIndicator) return;
    dom.typingIndicator.hidden = true;
  }

  function setChatStatus(text) {
    if (!dom.chatStatus) return;
    const statusTextSpan = dom.chatStatus.childNodes[dom.chatStatus.childNodes.length - 1];
    if (statusTextSpan && statusTextSpan.nodeType === Node.TEXT_NODE) {
      statusTextSpan.textContent = ' ' + text;
    }
  }

  /* -----------------------------------------------------------
     14. TEMPORARY AI RESPONSE LOGIC
     Replace only the body of fetchAIResponse() with a call to the
     Django REST API endpoint once the backend is available. It
     must keep returning a Promise resolving to { text, sources }.
  ----------------------------------------------------------- */
  const GENERIC_SOURCES = ['medical-document.pdf', 'medical-reference.pdf'];

  function buildSampleAnswer(question) {
    const lowerQuestion = question.toLowerCase();

    const knownConversation = SAMPLE_CONVERSATIONS[lowerQuestion];
    if (knownConversation) {
      return { text: knownConversation.answer, sources: knownConversation.sources };
    }

    if (lowerQuestion.indexOf('sleep') !== -1) {
      return {
        text:
          'Improving sleep often involves keeping a consistent sleep schedule, limiting screen time and ' +
          'caffeine before bed, keeping the bedroom cool and dark, and getting regular daytime activity. ' +
          'Persistent sleep problems are worth discussing with a healthcare professional.',
        sources: GENERIC_SOURCES
      };
    }

    if (lowerQuestion.indexOf('hypertension') !== -1 || lowerQuestion.indexOf('blood pressure') !== -1) {
      return {
        text:
          'Common symptoms associated with hypertension can include headaches, shortness of breath, and ' +
          'nosebleeds, though many people experience no symptoms at all. Regular monitoring and a ' +
          'healthcare professional evaluation are the most reliable ways to check blood pressure.',
        sources: GENERIC_SOURCES
      };
    }

    return {
      text:
        'Thanks for the question. MedAI would normally search the medical knowledge base for relevant ' +
        'passages and generate a source-backed educational answer here. This response is a placeholder ' +
        'until the retrieval and generation backend is connected.',
      sources: GENERIC_SOURCES
    };
  }

  function fetchAIResponse(question) {
    return new Promise(function (resolve) {
      const simulatedLatency = 900 + Math.floor(Math.random() * 700);
      window.setTimeout(function () {
        resolve(buildSampleAnswer(question));
      }, simulatedLatency);
    });
  }

  /* -----------------------------------------------------------
     15. SEND FLOW
  ----------------------------------------------------------- */
  function submitUserMessage(rawText) {
    const text = (rawText || '').trim();
    if (!text || state.isSending) return;

    state.isSending = true;
    if (dom.sendButton) dom.sendButton.disabled = true;

    hideWelcomeScreen();
    appendMessage('user', text);
    resetChatInput();

    if (containsEmergencyLanguage(text)) {
      showEmergencyAlert();
    }

    setChatStatus('Thinking...');
    showTypingIndicator();

    fetchAIResponse(text)
      .then(function (response) {
        hideTypingIndicator();
        appendMessage('ai', response.text, response.sources);
        setChatStatus('Ready to help');
      })
      .catch(function () {
        hideTypingIndicator();
        appendMessage(
          'ai',
          'Something went wrong while generating a response. Please try again in a moment.'
        );
        setChatStatus('Ready to help');
        showNotification('MedAI could not generate a response.', 'error');
      })
      .finally(function () {
        state.isSending = false;
        if (dom.sendButton) dom.sendButton.disabled = false;
      });
  }

  function handleSendFromInput() {
    if (!dom.chatInput) return;
    submitUserMessage(dom.chatInput.value);
  }

  function initSendFlow() {
    if (dom.chatInputForm) {
      dom.chatInputForm.addEventListener('submit', function (event) {
        event.preventDefault();
        handleSendFromInput();
      });
    }

    if (dom.sendButton) {
      dom.sendButton.addEventListener('click', function (event) {
        event.preventDefault();
        handleSendFromInput();
      });
    }
  }

  /* -----------------------------------------------------------
     16. SETTINGS MODAL
  ----------------------------------------------------------- */
  function openSettingsModal() {
    if (!dom.settingsModal) return;
    dom.settingsModal.hidden = false;
    document.body.style.overflow = 'hidden';

    const firstFocusable = dom.settingsModal.querySelector('input, button');
    if (firstFocusable) firstFocusable.focus();
  }

  function closeSettingsModal() {
    if (!dom.settingsModal) return;
    dom.settingsModal.hidden = true;
    document.body.style.overflow = '';
    if (dom.settingsButton) dom.settingsButton.focus();
  }

  function initSettingsModal() {
    if (dom.settingsButton) {
      dom.settingsButton.addEventListener('click', openSettingsModal);
    }
    if (dom.settingsModalClose) {
      dom.settingsModalClose.addEventListener('click', closeSettingsModal);
    }
    if (dom.settingsModal) {
      dom.settingsModal.addEventListener('click', function (event) {
        if (event.target === dom.settingsModal) closeSettingsModal();
      });
    }
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && dom.settingsModal && !dom.settingsModal.hidden) {
        closeSettingsModal();
      }
    });

    if (dom.enterToSendToggle) {
      state.enterToSend = dom.enterToSendToggle.checked;
      dom.enterToSendToggle.addEventListener('change', function () {
        state.enterToSend = dom.enterToSendToggle.checked;
        safeStorageSet('medai-enter-to-send', String(state.enterToSend));
      });
    }

    if (dom.showSourcesToggle) {
      state.showSources = dom.showSourcesToggle.checked;
      dom.showSourcesToggle.addEventListener('change', function () {
        state.showSources = dom.showSourcesToggle.checked;
        safeStorageSet('medai-show-sources', String(state.showSources));
        toggleExistingSourcesVisibility(state.showSources);
      });
    }

    const storedEnterToSend = safeStorageGet('medai-enter-to-send');
    if (storedEnterToSend !== null && dom.enterToSendToggle) {
      state.enterToSend = storedEnterToSend === 'true';
      dom.enterToSendToggle.checked = state.enterToSend;
    }

    const storedShowSources = safeStorageGet('medai-show-sources');
    if (storedShowSources !== null && dom.showSourcesToggle) {
      state.showSources = storedShowSources === 'true';
      dom.showSourcesToggle.checked = state.showSources;
    }
  }

  function toggleExistingSourcesVisibility(visible) {
    qsa('.message-sources', dom.chatMessages).forEach(function (sourcesEl) {
      sourcesEl.style.display = visible ? '' : 'none';
    });
  }

  /* -----------------------------------------------------------
     17. PROFILE MENU
  ----------------------------------------------------------- */
  function positionProfileMenu() {
    if (!dom.profileButton || !dom.profileMenu) return;
    const rect = dom.profileButton.getBoundingClientRect();
    dom.profileMenu.style.position = 'fixed';
    dom.profileMenu.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
    dom.profileMenu.style.left = rect.left + 'px';
  }

  function openProfileMenu() {
    if (!dom.profileMenu) return;
    positionProfileMenu();
    dom.profileMenu.hidden = false;
    if (dom.profileButton) dom.profileButton.setAttribute('aria-expanded', 'true');
  }

  function closeProfileMenu() {
    if (!dom.profileMenu) return;
    dom.profileMenu.hidden = true;
    if (dom.profileButton) dom.profileButton.setAttribute('aria-expanded', 'false');
  }

  function initProfileMenu() {
    if (!dom.profileButton || !dom.profileMenu) return;

    dom.profileButton.addEventListener('click', function (event) {
      event.stopPropagation();
      if (dom.profileMenu.hidden) {
        openProfileMenu();
      } else {
        closeProfileMenu();
      }
    });

    document.addEventListener('click', function (event) {
      if (dom.profileMenu.hidden) return;
      const clickedInsideMenu = dom.profileMenu.contains(event.target);
      const clickedButton = dom.profileButton.contains(event.target);
      if (!clickedInsideMenu && !clickedButton) {
        closeProfileMenu();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !dom.profileMenu.hidden) {
        closeProfileMenu();
      }
    });

    window.addEventListener('resize', function () {
      if (!dom.profileMenu.hidden) positionProfileMenu();
    });

    qsa('.profile-menu-item', dom.profileMenu).forEach(function (item) {
      item.addEventListener('click', function () {
        closeProfileMenu();
      });
    });
  }

  /* -----------------------------------------------------------
     18. INIT
  ----------------------------------------------------------- */
  function init() {
    cacheDom();

    initTheme();
    initMobileNav();
    initSmoothScroll();
    initEmergencyAlert();
    initChatSidebar();
    initConversationSearch();
    initConversationSelection();
    initNewChat();
    initClearChat();
    initQuickQuestions();
    initChatInput();
    initClearInput();
    initSendFlow();
    initSettingsModal();
    initProfileMenu();

    updateCharacterCount();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
