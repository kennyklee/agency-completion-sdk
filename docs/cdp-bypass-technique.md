# CDP Bypass Technique

## Discovery (Feb 6, 2026)

Mac discovered that Chrome DevTools Protocol (CDP) + human-like mouse movements can bypass PerimeterX bot detection on Fiverr.

## What Worked

1. **Chrome with remote debugging enabled**
   ```bash
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
     --remote-debugging-port=9222 \
     --user-data-dir=/tmp/chrome-debug
   ```

2. **Connect via CDP** (not Puppeteer's default automation)
   - Real browser with real fingerprint
   - No `navigator.webdriver` flag
   - Real Chrome user agent

3. **Human-like mouse movements**
   - Not instant jumps to target
   - Curved paths with acceleration/deceleration
   - Random micro-movements
   - Realistic timing between actions

4. **Result:** Got through PerimeterX, opened Google OAuth, typed email, proceeded to password screen.

## Why It Works

PerimeterX checks:
- **Browser fingerprint** — Real Chrome passes
- **Mouse patterns** — Human-like movements pass
- **Timing** — Realistic delays pass
- **WebDriver flag** — CDP doesn't set this (Puppeteer does)

Traditional automation fails because:
- Puppeteer sets `navigator.webdriver = true`
- Instant mouse teleportation is detectable
- No natural timing variance

## Implementation Notes

### Mouse Movement Algorithm

```javascript
async function humanLikeMove(page, startX, startY, endX, endY, steps = 20) {
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Ease-in-out curve
    const ease = t < 0.5 
      ? 2 * t * t 
      : 1 - Math.pow(-2 * t + 2, 2) / 2;
    
    const x = startX + (endX - startX) * ease + (Math.random() - 0.5) * 3;
    const y = startY + (endY - startY) * ease + (Math.random() - 0.5) * 3;
    
    await page.mouse.move(x, y);
    await sleep(10 + Math.random() * 20);
  }
}
```

### Typing with Human Timing

```javascript
async function humanType(page, text) {
  for (const char of text) {
    await page.keyboard.type(char);
    await sleep(50 + Math.random() * 100); // Variable delay per character
  }
}
```

## Product Potential

Every AI agent hits PerimeterX, Cloudflare, and similar bot detection. If we can package this:

1. **CDP Stealth Library** — Drop-in replacement for Puppeteer with human-like behavior
2. **Browser-as-a-Service** — API that returns a CDP-connected browser session
3. **Solve-as-you-go** — Detect bot walls, apply countermeasures automatically

## Next Steps

- [ ] Package into npm module
- [ ] Add more sites (test against Cloudflare, DataDome, etc.)
- [ ] Benchmark detection rates
- [ ] Build API service around it

## Related

- Mac's session: Feb 6, 2026 ~10 PM PST
- Fiverr login attempt that succeeded up to password step
- Need to continue with Google OAuth password entry
