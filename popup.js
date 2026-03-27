const FEATURES = ['bionic', 'lineFocus', 'sentenceHighlight', 'readingRuler', 'reformatter'];

document.addEventListener('DOMContentLoaded', async () => {
  const stored = await chrome.storage.sync.get([...FEATURES, 'rulerColor']);

  for (const id of FEATURES) {
    const el = document.getElementById(id);
    el.checked = !!stored[id];
    el.addEventListener('change', () => {
      chrome.storage.sync.set({ [id]: el.checked });
      sendToTab({ type: 'toggle', feature: id, enabled: el.checked });
    });
  }

  const rulerColor = document.getElementById('rulerColor');
  rulerColor.value = stored.rulerColor || '#3b82f6';
  rulerColor.addEventListener('input', () => {
    chrome.storage.sync.set({ rulerColor: rulerColor.value });
    sendToTab({ type: 'rulerColor', color: rulerColor.value });
  });
});

async function sendToTab(message) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    try {
      await chrome.tabs.sendMessage(tab.id, message);
    } catch {
      // Content script not loaded on this tab (e.g. chrome:// pages)
    }
  }
}
