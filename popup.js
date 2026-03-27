const FEATURES = ['fingerReading', 'lineReading', 'lineFocus', 'bionic'];
const SETTINGS = ['fingerWords', 'lineWidth', 'bionicColor', 'bionicWeight'];

document.addEventListener('DOMContentLoaded', async () => {
  const stored = await chrome.storage.sync.get([...FEATURES, ...SETTINGS]);

  // Feature toggles
  for (const id of FEATURES) {
    const el = document.getElementById(id);
    el.checked = !!stored[id];
    el.addEventListener('change', () => {
      chrome.storage.sync.set({ [id]: el.checked });
      sendToTab({ type: 'toggle', feature: id, enabled: el.checked });
    });
  }

  // Finger words slider
  const fingerWords = document.getElementById('fingerWords');
  const fingerWordsVal = document.getElementById('fingerWordsVal');
  fingerWords.value = stored.fingerWords || 4;
  fingerWordsVal.textContent = fingerWords.value;
  fingerWords.addEventListener('input', () => {
    fingerWordsVal.textContent = fingerWords.value;
    chrome.storage.sync.set({ fingerWords: parseInt(fingerWords.value) });
    sendToTab({ type: 'setting', key: 'fingerWords', value: parseInt(fingerWords.value) });
  });

  // Line width slider
  const lineWidth = document.getElementById('lineWidth');
  const lineWidthVal = document.getElementById('lineWidthVal');
  lineWidth.value = stored.lineWidth || 28;
  lineWidthVal.textContent = lineWidth.value;
  lineWidth.addEventListener('input', () => {
    lineWidthVal.textContent = lineWidth.value;
    chrome.storage.sync.set({ lineWidth: parseInt(lineWidth.value) });
    sendToTab({ type: 'setting', key: 'lineWidth', value: parseInt(lineWidth.value) });
  });

  // Bionic color
  const bionicColor = document.getElementById('bionicColor');
  bionicColor.value = stored.bionicColor || '#000000';
  bionicColor.addEventListener('input', () => {
    chrome.storage.sync.set({ bionicColor: bionicColor.value });
    sendToTab({ type: 'setting', key: 'bionicColor', value: bionicColor.value });
  });

  // Bionic weight
  const bionicWeight = document.getElementById('bionicWeight');
  bionicWeight.value = stored.bionicWeight || '900';
  bionicWeight.addEventListener('change', () => {
    chrome.storage.sync.set({ bionicWeight: bionicWeight.value });
    sendToTab({ type: 'setting', key: 'bionicWeight', value: bionicWeight.value });
  });
});

async function sendToTab(message) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    try {
      await chrome.tabs.sendMessage(tab.id, message);
    } catch {}
  }
}
