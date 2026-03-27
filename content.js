(() => {
  if (window.innerWidth < 100 || window.innerHeight < 100) return;

  const state = {
    fingerReading: false,
    lineReading: false,
    lineFocus: false,
    bionic: false,
  };

  const settings = {
    fingerWords: 4,
    lineWidth: 28,
    bionicColor: '#000000',
    bionicWeight: '900',
  };

  // ── Line Focus DOM ──
  const focusTop = document.createElement('div');
  focusTop.id = 'adhd-line-focus-top';
  document.documentElement.appendChild(focusTop);

  const focusBottom = document.createElement('div');
  focusBottom.id = 'adhd-line-focus-bottom';
  document.documentElement.appendChild(focusBottom);

  // ── Load saved state ──
  chrome.storage.sync.get(
    ['fingerReading', 'lineReading', 'lineFocus', 'bionic', 'fingerWords', 'lineWidth', 'bionicColor', 'bionicWeight'],
    (stored) => {
      if (stored.fingerReading !== undefined) state.fingerReading = stored.fingerReading;
      if (stored.lineReading !== undefined) state.lineReading = stored.lineReading;
      if (stored.lineFocus !== undefined) state.lineFocus = stored.lineFocus;
      if (stored.bionic !== undefined) state.bionic = stored.bionic;
      if (stored.fingerWords !== undefined) settings.fingerWords = stored.fingerWords;
      if (stored.lineWidth !== undefined) settings.lineWidth = stored.lineWidth;
      if (stored.bionicColor !== undefined) settings.bionicColor = stored.bionicColor;
      if (stored.bionicWeight !== undefined) settings.bionicWeight = stored.bionicWeight;

      if (state.lineFocus) {
        focusTop.style.display = 'block';
        focusBottom.style.display = 'block';
      }
      if (state.bionic) enableBionic();
    }
  );

  // ── Listen for popup messages ──
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'toggle') {
      state[msg.feature] = msg.enabled;
      if (msg.feature === 'lineFocus') {
        focusTop.style.display = msg.enabled ? 'block' : 'none';
        focusBottom.style.display = msg.enabled ? 'block' : 'none';
      }
      if (msg.feature === 'fingerReading' && !msg.enabled) {
        clearHighlight();
        words = [];
      }
      if (msg.feature === 'lineReading' && !msg.enabled) {
        clearLineHighlight();
        lines = [];
      }
      if (msg.feature === 'lineReading' && msg.enabled) {
        buildLines();
        if (lines.length > 0) highlightLine();
      }
      if (msg.feature === 'bionic') {
        msg.enabled ? enableBionic() : disableBionic();
      }
    }
    if (msg.type === 'setting') {
      settings[msg.key] = msg.value;
      if (msg.key === 'bionicColor' || msg.key === 'bionicWeight') {
        if (state.bionic) {
          updateBionicStyle();
        }
      }
    }
  });

  // ═══════════════════════════════════════════
  // Finger Reading
  // ═══════════════════════════════════════════
  let words = [];
  let wordIndex = 0;
  let highlightSpans = [];

  function collectWords() {
    const result = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const p = node.parentElement;
          if (!p) return NodeFilter.FILTER_REJECT;
          if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT'].includes(p.tagName))
            return NodeFilter.FILTER_REJECT;
          if (p.closest('.adhd-finger-highlight, #adhd-line-focus-top, #adhd-line-focus-bottom'))
            return NodeFilter.FILTER_REJECT;
          if (node.textContent.trim().length === 0)
            return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    let n;
    while ((n = walker.nextNode())) {
      const re = /\S+/g;
      let m;
      while ((m = re.exec(n.textContent)) !== null) {
        result.push({ node: n, start: m.index, end: m.index + m[0].length });
      }
    }
    return result;
  }

  function clearHighlight() {
    for (const s of highlightSpans) {
      if (s.parentNode) {
        s.replaceWith(document.createTextNode(s.textContent));
      }
    }
    highlightSpans = [];
    document.body.normalize();
  }

  function highlight() {
    if (words.length === 0) return;
    wordIndex = Math.max(0, Math.min(wordIndex, words.length - 1));

    const chunk = settings.fingerWords;
    const from = wordIndex;
    const to = Math.min(from + chunk, words.length);
    const spans = [];

    for (let i = to - 1; i >= from; i--) {
      const w = words[i];
      if (!w.node.parentNode) continue;
      const len = w.node.textContent.length;
      if (w.start >= len) continue;

      try {
        const range = document.createRange();
        range.setStart(w.node, w.start);
        range.setEnd(w.node, Math.min(w.end, len));
        const span = document.createElement('span');
        span.className = 'adhd-finger-highlight';
        range.surroundContents(span);
        spans.push(span);
      } catch {}
    }

    highlightSpans = spans;

    if (spans.length > 0) {
      const el = spans[spans.length - 1];
      const rect = el.getBoundingClientRect();
      if (rect.top < 50 || rect.bottom > window.innerHeight - 50) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  }

  function refreshAndHighlight() {
    clearHighlight();
    const saved = wordIndex;
    words = collectWords();
    wordIndex = saved;
    highlight();
  }

  // Click to start
  document.addEventListener('click', (e) => {
    if (!state.fingerReading) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    clearHighlight();
    words = collectWords();
    if (words.length === 0) return;

    const caret = document.caretRangeFromPoint?.(e.clientX, e.clientY);
    if (caret && caret.startContainer.nodeType === Node.TEXT_NODE) {
      const node = caret.startContainer;
      const offset = caret.startOffset;
      for (let i = 0; i < words.length; i++) {
        if (words[i].node === node && offset >= words[i].start && offset <= words[i].end) {
          wordIndex = i;
          highlight();
          return;
        }
      }
    }

    wordIndex = 0;
    highlight();
  });

  // ═══════════════════════════════════════════
  // Line Reading
  // ═══════════════════════════════════════════
  let lines = []; // array of arrays of word objects
  let lineIndex = 0;
  let lineHighlightSpans = [];

  function buildLines() {
    lines = [];
    lineIndex = 0;

    // Collect all words with their screen positions
    const allWords = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const p = node.parentElement;
          if (!p) return NodeFilter.FILTER_REJECT;
          if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT'].includes(p.tagName))
            return NodeFilter.FILTER_REJECT;
          if (p.closest('.adhd-line-highlight, #adhd-line-focus-top, #adhd-line-focus-bottom'))
            return NodeFilter.FILTER_REJECT;
          if (node.textContent.trim().length === 0)
            return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    let n;
    while ((n = walker.nextNode())) {
      const re = /\S+/g;
      let m;
      while ((m = re.exec(n.textContent)) !== null) {
        // Get the Y position of this word
        const range = document.createRange();
        range.setStart(n, m.index);
        range.setEnd(n, m.index + m[0].length);
        const rect = range.getBoundingClientRect();
        if (rect.height === 0) continue;

        allWords.push({
          node: n,
          start: m.index,
          end: m.index + m[0].length,
          y: Math.round(rect.top + window.scrollY),
        });
      }
    }

    if (allWords.length === 0) return;

    // Group words into lines by Y position (within 5px tolerance)
    allWords.sort((a, b) => a.y - b.y);
    let currentLine = [allWords[0]];
    let currentY = allWords[0].y;

    for (let i = 1; i < allWords.length; i++) {
      if (Math.abs(allWords[i].y - currentY) <= 5) {
        currentLine.push(allWords[i]);
      } else {
        lines.push(currentLine);
        currentLine = [allWords[i]];
        currentY = allWords[i].y;
      }
    }
    lines.push(currentLine);
  }

  function clearLineHighlight() {
    for (const s of lineHighlightSpans) {
      if (s.parentNode) {
        s.replaceWith(document.createTextNode(s.textContent));
      }
    }
    lineHighlightSpans = [];
    document.body.normalize();
  }

  function highlightLine() {
    if (lines.length === 0) return;
    lineIndex = Math.max(0, Math.min(lineIndex, lines.length - 1));

    const lineWords = lines[lineIndex];
    const spans = [];

    // Process in reverse to keep offsets valid
    for (let i = lineWords.length - 1; i >= 0; i--) {
      const w = lineWords[i];
      if (!w.node.parentNode) continue;
      const len = w.node.textContent.length;
      if (w.start >= len) continue;

      try {
        const range = document.createRange();
        range.setStart(w.node, w.start);
        range.setEnd(w.node, Math.min(w.end, len));
        const span = document.createElement('span');
        span.className = 'adhd-line-highlight';
        range.surroundContents(span);
        spans.push(span);
      } catch {}
    }

    lineHighlightSpans = spans;

    if (spans.length > 0) {
      const el = spans[spans.length - 1];
      const rect = el.getBoundingClientRect();
      if (rect.top < 50 || rect.bottom > window.innerHeight - 50) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  }

  function refreshLineHighlight() {
    clearLineHighlight();
    const saved = lineIndex;
    buildLines();
    lineIndex = saved;
    highlightLine();
  }

  // Click to set line position
  document.addEventListener('click', (e) => {
    if (!state.lineReading) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    clearLineHighlight();
    buildLines();
    if (lines.length === 0) return;

    // Find the line closest to the click Y
    const clickY = e.clientY + window.scrollY;
    let closest = 0;
    let closestDist = Infinity;
    for (let i = 0; i < lines.length; i++) {
      const dist = Math.abs(lines[i][0].y - clickY);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    }

    lineIndex = closest;
    highlightLine();
  });

  // Keyboard (capture phase)
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // Finger reading (← → ↑ ↓)
    if (state.fingerReading && words.length > 0) {
      const chunk = settings.fingerWords;
      let handled = true;

      if (e.key === 'ArrowRight') {
        wordIndex = Math.min(wordIndex + chunk, words.length - 1);
      } else if (e.key === 'ArrowLeft') {
        wordIndex = Math.max(wordIndex - chunk, 0);
      } else if (e.key === 'ArrowDown') {
        wordIndex = Math.min(wordIndex + 15, words.length - 1);
      } else if (e.key === 'ArrowUp') {
        wordIndex = Math.max(wordIndex - 15, 0);
      } else {
        handled = false;
      }

      if (handled) {
        e.preventDefault();
        e.stopPropagation();
        refreshAndHighlight();
        return;
      }
    }

    // Line reading (↑ ↓)
    if (state.lineReading && lines.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        lineIndex = Math.min(lineIndex + 1, lines.length - 1);
        refreshLineHighlight();
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        lineIndex = Math.max(lineIndex - 1, 0);
        refreshLineHighlight();
        return;
      }
    }

    // Line focus (↑ ↓)
    if (state.lineFocus) {
      const step = settings.lineWidth;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        focusY = Math.min(window.innerHeight, focusY + step);
        updateFocusPosition();
        if (focusY > window.innerHeight * 0.7) {
          window.scrollBy(0, step);
          focusY -= step * 0.5;
          updateFocusPosition();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        focusY = Math.max(0, focusY - step);
        updateFocusPosition();
        if (focusY < window.innerHeight * 0.3) {
          window.scrollBy(0, -step);
          focusY += step * 0.5;
          updateFocusPosition();
        }
      }
    }
  }, true);

  // ═══════════════════════════════════════════
  // Line Focus
  // ═══════════════════════════════════════════
  let focusY = window.innerHeight / 2;

  function updateFocusPosition() {
    const half = settings.lineWidth / 2;
    const top = Math.max(0, focusY - half);
    const bottom = focusY + half;
    focusTop.style.height = top + 'px';
    focusBottom.style.top = bottom + 'px';
    focusBottom.style.height = (window.innerHeight - bottom) + 'px';
  }

  document.addEventListener('mousemove', (e) => {
    if (state.lineFocus) {
      focusY = e.clientY;
      updateFocusPosition();
    }
  });

  // ═══════════════════════════════════════════
  // Bionic Reading
  // ═══════════════════════════════════════════
  const BIONIC_ATTR = 'data-adhd-bionic';

  function enableBionic() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const p = node.parentElement;
          if (!p) return NodeFilter.FILTER_REJECT;
          if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'CODE', 'PRE'].includes(p.tagName))
            return NodeFilter.FILTER_REJECT;
          if (p.closest(`[${BIONIC_ATTR}], #adhd-line-focus-top, #adhd-line-focus-bottom, .adhd-finger-highlight`))
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
      const text = textNode.textContent;
      if (!text.trim()) continue;

      const span = document.createElement('span');
      span.setAttribute(BIONIC_ATTR, '');

      const parts = text.split(/(\s+)/);
      for (const part of parts) {
        if (/^\s+$/.test(part) || part.length <= 1) {
          span.appendChild(document.createTextNode(part));
          continue;
        }
        const boldLen = part.length <= 3 ? Math.ceil(part.length / 2) : Math.ceil(part.length * 0.4);

        const b = document.createElement('span');
        b.className = 'adhd-bionic-bold';
        b.style.fontWeight = settings.bionicWeight;
        b.style.color = settings.bionicColor;
        b.textContent = part.slice(0, boldLen);
        span.appendChild(b);

        const rest = document.createElement('span');
        rest.style.fontWeight = 'normal';
        rest.textContent = part.slice(boldLen);
        span.appendChild(rest);
      }

      textNode.replaceWith(span);
    }
  }

  function disableBionic() {
    for (const el of document.querySelectorAll(`[${BIONIC_ATTR}]`)) {
      el.replaceWith(document.createTextNode(el.textContent));
    }
    document.body.normalize();
  }

  function updateBionicStyle() {
    for (const el of document.querySelectorAll('.adhd-bionic-bold')) {
      el.style.fontWeight = settings.bionicWeight;
      el.style.color = settings.bionicColor;
    }
  }
})();
