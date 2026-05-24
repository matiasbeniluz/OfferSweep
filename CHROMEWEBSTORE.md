# Chrome Web Store Listing — OfferSweep

> Last Updated: 2026-05-24

## Store Listing

**Extension Name** [REQUIRED]
OfferSweep

**Short Description** [REQUIRED]
Automatically and safely sweeps up all merchant offers and rewards on your credit cards with customizable delays.

**Detailed Description** [REQUIRED]
OfferSweep is a premium helper extension designed to automate the process of adding merchant deals to your credit cards, eliminating the tedious work of clicking dozens of individual offers manually across different card portals.

Key Features:
- Automates activating all available merchant deals in your credit card portal.
- Safety delay configurations: protect your account by setting minimum and maximum click intervals (supporting down to 100ms/300ms speeds) to mimic human behavior.
- Live progress metrics: view how many offers have been processed, how many are remaining, and a sleek animated progress bar.
- Interactive terminal console: watch chronological, real-time logs of what the loader is doing.
- Bulletproof state machine: built specifically for Single Page Applications (SPA) to survive route transitions, loading states, and page reloads seamlessly.
- Multi-Bank Future Scaling: Architected to support multi-bank portals (Chase, American Express, Capital One, etc.) using brand-neutral schemas.
- Complete privacy: runs entirely inside your local browser. The extension never collects, stores, transmits, or shares any credentials, financial data, or user activity.

How to use it:
1. Open the OfferSweep popup icon.
2. If you are not on your card's offers page, click "Open Card Portal" to load your online account.
3. Configure your preferred min and max speed settings using the sliders.
4. Click "Start Auto-Adding".
5. Leave the tab open while the extension highlights, clicks, and registers all offers, showing live status updates.

Privacy & Security Note:
We take your financial security very seriously. This helper tool functions entirely locally within your browser. It does not talk to any external servers, contains zero telemetry or trackers, and is completely free of data collection.

**Category** [REQUIRED]
Productivity

**Single Purpose** [REQUIRED]
Automatically and safely adds all available credit card merchant offers.

**Primary Language** [REQUIRED]
English

---

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | `icons/icon-128.png` |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | ⬜ Not created | User to capture popup dashboard |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | User to capture target card highlighting on the portal |
| Screenshot 3 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | User to capture console logs showing successful adder run |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Not created | |

### Screenshot Notes
- **Screenshot 1**: Show the glassmorphic extension popup open on your portal with active logs and progress metrics showing some offers being successfully processed.
- **Screenshot 2**: Demonstrate the active card outline highlighting effect (`.ag-active-card` pulsing in gold) on the card dashboard with the float-in toast notification on the top right.
- **Screenshot 3**: Capture the final status page displaying "Completed!" and badge colored green with an empty list of remaining offers.

---

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | permissions | Essential to save user speed configurations (min/max delays), processed offer text fingerprints, console logs, and state parameters so the automation state survives Single Page Application routing changes or page reloads. |
| `tabs` | permissions | Required to read the current browser tab's active URL to check if the user is on the correct card portal page, enabling the action buttons or providing direct navigation support if they are not. |
| `scripting` | permissions | Enables dynamic programmatic injection of the content script into active card portals on-demand, removing the need for manual tab refreshes upon installation. |
| `*://*.chase.com/*` | host_permissions | Restricts the extension's execution context strictly to designated credit card portals to target offer tiles and programmatically simulate clicks. |

---

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

---

## Privacy Policy

**Privacy Policy URL** [RECOMMENDED]
[Developer's GitHub Pages or personal site showing standard local-only no-data-collection policy]

---

## Distribution

**Visibility**: Public
**Regions**: All regions
**Pricing**: Free

---

## Developer Info

**Publisher Name** [REQUIRED]
[User's Publisher Name]

**Contact Email** [REQUIRED]
[User's Developer Contact Email]

**Support URL / Email** [RECOMMENDED]
[User's Support URL or GitHub Issues repository]

---

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.0 | 2026-05-24 | Initial release featuring Manifest V3, robust state-driven click automation, safety delay configurations, visual card indicators, page toasts, and glassmorphic telemetry popup dashboard. | Draft |

---

## Review Notes

### Known Issues / Limitations
- Relies on card portals maintaining standard selectors for card tiles. If layout redesigns occur, updates will be pushed to match new DOM nodes.
- Requires browser tabs to remain open while running (cannot run in complete background without card portal active since DOM clicks are required).
