# Agency Completion Chrome Extension

Browser extension for human operators to complete tasks queued by AI agents.

## Installation (Development)

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select this `extension` folder

## Usage

1. Click the extension icon
2. Enter your operator key and server URL
3. See available tasks, click "Claim"
4. Complete the task on the opened page
5. Click "Complete" on the floating widget
6. Get paid!

## Files

- `manifest.json` — Extension configuration (Manifest V3)
- `popup.html/js` — Extension popup UI
- `background.js` — Service worker for polling and badge updates
- `content.js` — Floating widget injected on task pages
- `widget.css` — Styles for the floating widget

## Icons

Place your icon files in the `icons/` folder:
- `icon16.png` — 16x16 pixels
- `icon48.png` — 48x48 pixels
- `icon128.png` — 128x128 pixels

For now, the extension will work without icons (shows default).

## Server

The extension expects a server running at `http://localhost:3456` by default.

Start the server:
```bash
cd ../server
npm install
npx tsx src/index.ts
```

## Development

- Edit files, then click "Reload" in chrome://extensions
- Check background script logs in the extension's service worker console
- Content script logs appear in the page's DevTools console
