(() => {
  // ── State ──
  const state = {
    bionic: false,
    lineFocus: false,
    sentenceHighlight: false,
    readingRuler: false,
    reformatter: false,
    rulerColor: '#3b82f6',
  };

  // ── DOM elements created once ──
  const ruler = document.createElement('div');
  ruler.id = 'adhd-reading-ruler';
  document.documentElement.appendChild(ruler);

  const focusTop = document.createElement('div');
  focusTop.id = 'adhd-line-focus-top';
  document.documentElement.appendChild(focusTop);

  const focusBottom = document.createElement('div');
  focusBottom.id = 'adhd-line-focus-bottom';
  document.documentElement.appendChild(focusBottom);

  const reformatBtn = document.createElement('button');
  reformatBtn.id = 'adhd-reformat-btn';
  reformatBtn.textContent = 'Simplify Text';
  document.documentElement.appendChild(reformatBtn);

  // ── Load saved state ──
  chrome.storage.sync.get(
    ['bionic', 'lineFocus', 'sentenceHighlight', 'readingRuler', 'reformatter', 'rulerColor'],
    (stored) => {
      for (const key of Object.keys(state)) {
        if (stored[key] !== undefined) state[key] = stored[key];
      }
      applyAll();
    }
  );

  // ── Listen for popup messages ──
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'toggle') {
      state[msg.feature] = msg.enabled;
      applyFeature(msg.feature);
    } else if (msg.type === 'rulerColor') {
      state.rulerColor = msg.color;
      ruler.style.background = msg.color;
    }
  });

  function applyAll() {
    for (const feature of Object.keys(state)) {
      if (feature !== 'rulerColor') applyFeature(feature);
    }
    ruler.style.background = state.rulerColor;
  }

  function applyFeature(feature) {
    switch (feature) {
      case 'bionic':
        state.bionic ? enableBionic() : disableBionic();
        break;
      case 'lineFocus':
        focusTop.style.display = state.lineFocus ? 'block' : 'none';
        focusBottom.style.display = state.lineFocus ? 'block' : 'none';
        break;
      case 'sentenceHighlight':
        // Just toggling — click handler checks state
        break;
      case 'readingRuler':
        ruler.style.display = state.readingRuler ? 'block' : 'none';
        break;
      case 'reformatter':
        // Just toggling — selection handler checks state
        break;
    }
  }

  // ═══════════════════════════════════════════
  // 1. Bionic Reading
  // ═══════════════════════════════════════════
  const BIONIC_ATTR = 'data-adhd-bionic-original';

  function enableBionic() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName;
          if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'CODE', 'PRE'].includes(tag))
            return NodeFilter.FILTER_REJECT;
          if (parent.closest('#adhd-reformat-btn, #adhd-reading-ruler, #adhd-line-focus-top, #adhd-line-focus-bottom'))
            return NodeFilter.FILTER_REJECT;
          if (node.textContent.trim().length === 0)
            return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    for (const textNode of textNodes) {
      // Skip if already processed
      if (textNode.parentElement?.closest(`[${BIONIC_ATTR}]`)) continue;

      const text = textNode.textContent;
      if (!text.trim()) continue;

      const span = document.createElement('span');
      span.classList.add('adhd-bionic');
      span.setAttribute(BIONIC_ATTR, '');

      const words = text.split(/(\s+)/);
      for (const word of words) {
        if (/^\s+$/.test(word) || word.length <= 1) {
          span.appendChild(document.createTextNode(word));
          continue;
        }
        // Bold first half for short words, first ~40% for longer words
        const boldLen = word.length <= 3 ? Math.ceil(word.length / 2) : Math.ceil(word.length * 0.4);
        const b = document.createElement('b');
        b.textContent = word.slice(0, boldLen);
        span.appendChild(b);
        const rest = document.createElement('span');
        rest.style.fontWeight = 'normal';
        rest.textContent = word.slice(boldLen);
        span.appendChild(rest);
      }

      textNode.replaceWith(span);
    }
  }

  function disableBionic() {
    for (const el of document.querySelectorAll(`[${BIONIC_ATTR}]`)) {
      el.replaceWith(document.createTextNode(el.textContent));
    }
  }

  // ═══════════════════════════════════════════
  // 2. Line Focus Mode + Reading Ruler position
  // ═══════════════════════════════════════════
  const LINE_HEIGHT = 40;
  const ARROW_STEP = 40;
  let focusY = window.innerHeight / 2;

  function updateFocusPosition(y) {
    focusY = y;

    if (state.readingRuler) {
      ruler.style.top = y + 'px';
    }

    if (state.lineFocus) {
      const top = Math.max(0, y - LINE_HEIGHT / 2);
      const bottom = y + LINE_HEIGHT / 2;
      focusTop.style.height = top + 'px';
      focusBottom.style.top = bottom + 'px';
      focusBottom.style.height = (window.innerHeight - bottom) + 'px';
    }
  }

  document.addEventListener('mousemove', (e) => {
    if (state.readingRuler || state.lineFocus) {
      updateFocusPosition(e.clientY);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (!state.lineFocus && !state.readingRuler) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      updateFocusPosition(Math.min(window.innerHeight, focusY + ARROW_STEP));
      // Scroll page when focus reaches lower third
      if (focusY > window.innerHeight * 0.7) {
        window.scrollBy(0, ARROW_STEP);
        focusY -= ARROW_STEP * 0.5;
        updateFocusPosition(focusY);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      updateFocusPosition(Math.max(0, focusY - ARROW_STEP));
      // Scroll page when focus reaches upper third
      if (focusY < window.innerHeight * 0.3) {
        window.scrollBy(0, -ARROW_STEP);
        focusY += ARROW_STEP * 0.5;
        updateFocusPosition(focusY);
      }
    }
  });

  // ═══════════════════════════════════════════
  // 3. Sentence Highlighter
  // ═══════════════════════════════════════════
  document.addEventListener('click', (e) => {
    if (!state.sentenceHighlight) return;
    if (e.target.closest('#adhd-reformat-btn')) return;

    // If clicking an already-highlighted sentence, remove highlight
    const highlighted = e.target.closest('.adhd-sentence-highlight');
    if (highlighted) {
      const text = highlighted.textContent;
      highlighted.replaceWith(document.createTextNode(text));
      return;
    }

    // Find the sentence at click position
    const range = getWordRangeAtPoint(e.clientX, e.clientY);
    if (!range) return;

    const sentenceRange = expandToSentence(range);
    if (!sentenceRange) return;

    const span = document.createElement('span');
    span.classList.add('adhd-sentence-highlight');

    try {
      sentenceRange.surroundContents(span);
    } catch {
      // surroundContents fails across element boundaries — wrap extracted content instead
      const frag = sentenceRange.extractContents();
      span.appendChild(frag);
      sentenceRange.insertNode(span);
    }
  });

  function getWordRangeAtPoint(x, y) {
    if (document.caretRangeFromPoint) {
      return document.caretRangeFromPoint(x, y);
    }
    if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(x, y);
      if (!pos) return null;
      const r = document.createRange();
      r.setStart(pos.offsetNode, pos.offset);
      r.collapse(true);
      return r;
    }
    return null;
  }

  function expandToSentence(range) {
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return null;

    const text = node.textContent;
    const offset = range.startOffset;

    // Find sentence boundaries
    let start = offset;
    while (start > 0 && !/[.!?]\s/.test(text.slice(start - 1, start + 1))) start--;
    if (start > 0) start++; // skip past the space after the period

    let end = offset;
    while (end < text.length && !/[.!?]/.test(text[end])) end++;
    if (end < text.length) end++; // include the period

    const sentenceRange = document.createRange();
    sentenceRange.setStart(node, start);
    sentenceRange.setEnd(node, end);
    return sentenceRange;
  }

  // ═══════════════════════════════════════════
  // 4. Reading Ruler (handled in mousemove above)
  // ═══════════════════════════════════════════

  // ═══════════════════════════════════════════
  // 5. Text Reformatter
  // ═══════════════════════════════════════════
  let selectedRange = null;

  document.addEventListener('mouseup', (e) => {
    if (!state.reformatter) {
      reformatBtn.style.display = 'none';
      return;
    }

    if (e.target.closest('#adhd-reformat-btn')) return;

    const { apiKey } = await chrome.storage.sync.get('apiKey');
    if (!apiKey) {
      reformatBtn.style.display = 'none';
      return;
    }

    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (!text || text.length < 20) {
      reformatBtn.style.display = 'none';
      return;
    }

    selectedRange = selection.getRangeAt(0).cloneRange();

    const rect = selectedRange.getBoundingClientRect();
    reformatBtn.style.top = (rect.bottom + window.scrollY + 6) + 'px';
    reformatBtn.style.left = (rect.left + window.scrollX) + 'px';
    reformatBtn.style.display = 'block';
  });

  reformatBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedRange) return;

    const originalText = selectedRange.toString();
    reformatBtn.textContent = 'Simplifying...';
    reformatBtn.classList.add('loading');

    try {
      const { apiKey } = await chrome.storage.sync.get('apiKey');
      if (!apiKey) {
        alert('Please set your Claude API key in the extension popup.');
        return;
      }

      const simplified = await callClaude(apiKey, originalText);
      insertReformattedText(selectedRange, simplified);
    } catch (err) {
      alert('Reformatting failed: ' + err.message);
    } finally {
      reformatBtn.style.display = 'none';
      reformatBtn.textContent = 'Simplify Text';
      reformatBtn.classList.remove('loading');
      selectedRange = null;
    }
  });

  async function callClaude(apiKey, text) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `Rewrite the following text to be easier to read for someone with ADHD. Break it into shorter sentences and use bullet points where appropriate. Return ONLY the reformatted text as clean HTML (use <p>, <ul>, <li> tags). Do not include any preamble or explanation.\n\nText:\n${text}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  function insertReformattedText(range, html) {
    const container = document.createElement('div');
    container.classList.add('adhd-reformatted');
    container.innerHTML = html;

    range.deleteContents();
    range.insertNode(container);

    window.getSelection().removeAllRanges();
  }
})();
