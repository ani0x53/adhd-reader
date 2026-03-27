# ADHD Reading Assistant

A free, open-source Chrome extension that makes reading on the web easier for people with ADHD. No accounts, no API keys, no data collection — everything runs locally in your browser.

## Features

### Finger Reading
Click any word to start, then use arrow keys to move through text. A black highlight follows your position like a finger tracking across the page.

- **←** / **→** — Move backward/forward by a chunk of words
- **↑** / **↓** — Jump up/down roughly one line
- **Click** any word to reposition
- **Configurable:** Number of highlighted words (1–10, default 4)

### Line Reading
Like Finger Reading, but highlights an entire line of text at once. Great for reading paragraph-heavy content line by line.

- **↑** / **↓** — Move to previous/next line
- **Click** any line to start from there
- Auto-scrolls as you move through the page

### Line Focus
Dims the entire page except a narrow band around the line you're reading. Reduces visual overwhelm on dense pages.

- Follows your **mouse** automatically
- Also controllable with **↑↓ arrow keys**
- **Configurable:** Band width (10–80px, default 28)

### Bionic Reading
Bolds the first few letters of every word, creating visual anchors that help your eyes track faster across lines.

- **Configurable:** Bold color (any color, default black)
- **Configurable:** Font weight (semi-bold / bold / extra-bold / black)

## Install

1. Clone this repo or [download the ZIP](https://github.com/ani0x53/adhd-reader/archive/refs/heads/main.zip)
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked**
5. Select the `adhd-reader` folder
6. Pin the extension icon in your toolbar for quick access

## Usage

Click the extension icon to open the popup. Toggle features on/off and adjust settings. All preferences are saved and persist across browser sessions.

### Keyboard shortcuts

| Key | Finger Reading | Line Reading | Line Focus |
|-----|---------------|-------------|------------|
| ← | Previous words | — | — |
| → | Next words | — | — |
| ↑ | Jump up ~1 line | Previous line | Move focus up |
| ↓ | Jump down ~1 line | Next line | Move focus down |
| Click | Set word position | Set line position | — |

## Known Limitations

- **Google Docs** — Google Docs renders text on a `<canvas>` element (pixels, not HTML), so Finger Reading, Line Reading, and Bionic Reading cannot access the document text. Line Focus works with mouse only (Google Docs captures keyboard events).
- **Workaround for Google Docs** — Go to **File → Download as → Web page (.html)**, then open the downloaded HTML file in Chrome. All four features work fully on the downloaded file.
- **Input fields** — Arrow keys are not captured when you're focused on a text input or textarea, so typing is not affected.
- **Canvas-rendered sites** — Any site that renders text as canvas/images (some PDF viewers, design tools) will have the same limitation as Google Docs.

## How It Works

The extension injects a content script into every page that:
- Walks the DOM tree to find text nodes
- Wraps target words in `<span>` elements for highlighting (Finger Reading, Line Reading, Bionic Reading)
- Groups words by screen position to detect visual lines (Line Reading)
- Adds fixed-position overlay `<div>` elements for dimming (Line Focus)
- Listens for mouse and keyboard events to update positions

No data leaves your browser. No external APIs. No tracking.

## Tech Stack

- Chrome Extension Manifest V3
- Vanilla JavaScript (no frameworks, no build step)
- CSS for overlays and highlights

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

Ideas for contributions:
- Customizable highlight colors for Finger Reading and Line Reading
- Speed/auto-advance mode for Finger Reading and Line Reading
- Firefox/Safari port
- Chrome Web Store listing

## License

[MIT](LICENSE)
