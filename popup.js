const FEATURES = ['bionic', 'lineFocus', 'sentenceHighlight', 'readingRuler', 'reformatter'];

document.addEventListener('DOMContentLoaded', async () => {
  const stored = await chrome.storage.sync.get([...FEATURES, 'rulerColor', 'apiKey']);

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

  if (stored.apiKey) {
    document.getElementById('apiKey').value = stored.apiKey;
  }

  document.getElementById('saveKey').addEventListener('click', () => {
    const key = document.getElementById('apiKey').value.trim();
    chrome.storage.sync.set({ apiKey: key });
    const status = document.getElementById('keyStatus');
    status.style.display = 'block';
    setTimeout(() => { status.style.display = 'none'; }, 2000);
  });
});

async function sendToTab(message) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, message);
  }
}
