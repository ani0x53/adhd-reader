# ADHD Reading Assistant

A Chrome extension that makes reading on the web easier for people with ADHD.

## Features

- **Bionic Reading** — Bolds the first few letters of every word so your eyes track faster across lines
- **Line Focus Mode** — Dims everything except the line near your cursor, reducing visual overwhelm
- **Sentence Highlighter** — Click any sentence to highlight it yellow; click again to remove
- **Reading Ruler** — A colored horizontal line follows your cursor down the page (color customizable)
- **Text Reformatter** — Select text and click "Simplify Text" to break it into shorter sentences and bullet points using Claude AI

## Install

1. Clone this repo or [download the ZIP](https://github.com/ani0x53/adhd-reader/archive/refs/heads/main.zip)
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked**
5. Select the `adhd-reader` folder

## Text Reformatter Setup

The Text Reformatter feature uses the Claude API. To set it up:

1. Get an API key from [console.anthropic.com](https://console.anthropic.com)
2. Click the extension icon in your toolbar
3. Paste your API key in the field at the bottom and click **Save Key**

## Usage

Click the extension icon to toggle features on/off. All settings are saved and persist across sessions.

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

[MIT](LICENSE)
