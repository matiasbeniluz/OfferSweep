# OfferSweep 💳✨

OfferSweep is a premium, brand-neutral browser extension designed to safely, reliably, and automatically add credit card merchant offers to your accounts. Utilizing a deterministic click-and-back state machine, OfferSweep streamlines the process of loading rewards, currently optimized for Chase Offers, with modular hookpoints designed for future expansion to American Express, Capital One, and other credit card portals.

---

## Key Features

- **Resilient State Machine**: Built on an automated `click`-`back` flow that tracks active state, allowing it to recover gracefully from page reloads, network delays, or client-side router transitions.
- **Premium Glassmorphic Dashboard**: A high-end dark dashboard styled with deep royal blue and glowing gold accents, featuring active metrics, customized status badges, and real-time terminal output logs rendered in **Fira Code**.
- **Double-Safe Delay Controllers**: Dual range sliders linked to Chrome storage with safety-locking rules, permitting highly rapid runs (down to 100ms min / 300ms max defaults) or safe, throttled delays to mimic natural user behaviour.
- **Sanitized Offer Fingerprints**: Intelligent parser filters out temporary UI indicators (like `"NEW"`, expiring tags, or case variants) to ensure stable comparisons, avoiding duplicate clicks or stuck states.
- **Dynamic Lazy-Load Scaling**: Automatically recalculates total deals in real-time as you scroll the feed, preventing lazy-loading index mismatches.
- **Live Visual Overlays**: Pulsing gold outlines around targeted tiles and visual overlays directly on Chase's offer pages, including graceful, sliding top-right toasts that show feedback even when the popup dashboard is closed.
- **Programmatic Auto-Injection**: Instantly injects content overlays and script controllers into preexisting banking tabs upon opening the dashboard—no manual page reloads required.

---

## Project Structure

```
├── manifest.json         # Extension Manifest V3 configuration
├── content.js            # Core page-level state machine & scraping engine
├── content.css           # Glowing borders, dimmed states, and toast notifications
├── background.js         # Service worker tracking badges and active states
├── popup.html            # Dashboard layout (meters, sliders, terminal logs)
├── popup.css             # Luxury glassmorphic theme styling
├── popup.js              # Dashboard telemetry and injection logic
├── generate_icons.py     # Script to generate asset icons dynamically via Pillow
└── icons/                # High-res asset icons (16px, 48px, 128px)
```

---

## Installation & Setup

1. **Clone/Download the repository** to your local machine:
   ```bash
   git clone git@github.com:matiasbeniluz/OfferSweep.git
   cd OfferSweep
   ```
2. **Open Chrome Extensions Page**:
   - Navigate to `chrome://extensions/` in your Google Chrome browser.
3. **Enable Developer Mode**:
   - Toggle the **Developer mode** switch in the top-right corner to **ON**.
4. **Load Unpacked**:
   - Click the **Load unpacked** button in the top-left corner.
   - Select the `OfferSweep` project directory containing `manifest.json`.

---

## How to Use

1. Click the **OfferSweep** icon in the extensions toolbar to open the control dashboard.
2. If you are not on the banking portal, click the **Open Card Portal** button to navigate straight to the secure offers hub.
3. Log in to your banking account and navigate to the offers portal.
4. Set your desired Min and Max action delays using the speed sliders.
5. Click **Start Auto-Adding**.
6. Monitor active progress through the terminal logs or watch the live, glowing targets on the page as OfferSweep adds your deals automatically.

---

## License

This project is licensed under the MIT License.
