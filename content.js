// OfferSweep - Content Script
let isRunning = false;
let retryCount = 0;
const maxRetries = 5;

// Helper to check if the extension background context is still valid
function isContextValid() {
  return typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;
}

// Helper to sleep/wait
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to write logs to Chrome Storage
async function log(message) {
  if (!isContextValid()) return;
  const timestamp = new Date().toLocaleTimeString();
  const logMsg = `[${timestamp}] ${message}`;
  console.log(`%c[OfferSweep] ${message}`, 'color: #d4af37; font-weight: bold;');
  
  try {
    const data = await chrome.storage.local.get({ logs: [] });
    const updatedLogs = [...data.logs, logMsg].slice(-100); // Keep last 100
    await chrome.storage.local.set({ logs: updatedLogs });
  } catch (err) {
    console.log("[OfferSweep] Log storage failed (context likely invalidated).");
  }
}

// Get a random delay between min and max
function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

// Visual indicator of toast notifications in the card portal UI
function showToast(message, type = 'info') {
  // Remove existing toast if any
  const existing = document.getElementById('chase-adder-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'chase-adder-toast';
  toast.className = `chase-adder-toast ${type}`;
  
  const title = document.createElement('div');
  title.className = 'chase-adder-toast-title';
  title.innerText = 'OfferSweep';
  
  const body = document.createElement('div');
  body.className = 'chase-adder-toast-body';
  body.innerText = message;
  
  toast.appendChild(title);
  toast.appendChild(body);
  document.body.appendChild(toast);
  
  // Slide out after 3 seconds
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// Scans the visible page DOM to find actual card names and credit card ending numbers
function getActiveCardNameOnPage() {
  // 1. Try to find the selected option text in any select dropdown
  const select = document.querySelector('select');
  if (select && select.selectedIndex >= 0) {
    const text = select.options[select.selectedIndex].text.trim().replace(/\s+/g, ' ');
    if (text && !text.includes('--') && text.length > 3) return text;
  }
  
  // 2. Look for active card selector buttons
  const activeSelectors = [
    '[class*="card-selector"]',
    '[class*="account-selector"]',
    '[class*="dropdown-trigger"]',
    'button[aria-haspopup="listbox"]',
    'button[id*="account"]',
    '[class*="active-account"]',
    '.account-dropdown-button',
    '.card-select'
  ];
  
  for (const selector of activeSelectors) {
    const el = document.querySelector(selector);
    if (el && el.innerText) {
      const text = el.innerText.trim().replace(/\s+/g, ' ');
      // Verify it has card ending style like (...1234) or card names
      if (text && text.length > 3 && text.length < 50 && !text.includes('\n')) {
        return text;
      }
    }
  }
  
  // 3. Regex scan visible page text for any credit card mask endings: e.g. (...1234) or (*1234)
  const cardMaskRegex = /([a-zA-Z\s]+(?:\(\.\.\.\d{4}\)|\(\*\d{4}\)|\d{4}))/;
  const bodyText = document.body.innerText;
  const match = bodyText.match(cardMaskRegex);
  if (match && match[1]) {
    const clean = match[1].trim().replace(/\s+/g, ' ');
    if (clean.length > 3 && clean.length < 50) return clean;
  }
  
  return null;
}

// Scans the active page for eligible card accounts and their IDs
function scanCardAccounts() {
  if (!isContextValid()) return;

  try {
    // 1. Search for standard or ARIA select elements
    const select = document.querySelector('select#account-select') || 
                   document.querySelector('select[class*="account"]') || 
                   document.querySelector('select[aria-label*="account"]') ||
                   document.querySelector('select');
    
    if (select) {
      const cards = [];
      const options = [...select.querySelectorAll('option')];
      options.forEach(opt => {
        if (opt.value && opt.value !== '') {
          cards.push({
            name: opt.innerText.trim().replace(/\s+/g, ' '),
            id: opt.value
          });
        }
      });
      if (cards.length > 0) {
        chrome.storage.local.set({ detectedCards: cards });
        return;
      }
    }
    
    // 2. Fallback to links or elements with accountId attributes
    const cardElements = document.querySelectorAll('[data-account-id], [data-id*="account"], a[href*="accountId"]');
    if (cardElements.length > 0) {
      const cards = [];
      const seen = new Set();
      cardElements.forEach(el => {
        let id = el.getAttribute('data-account-id') || el.getAttribute('data-id');
        if (!id && el.href) {
          const match = el.href.match(/accountId=([^&]+)/);
          if (match) id = match[1];
        }
        if (id && !seen.has(id)) {
          seen.add(id);
          cards.push({
            name: el.innerText.trim().replace(/\s+/g, ' ') || `Card Ending in ${id.slice(-4)}`,
            id: id
          });
        }
      });
      if (cards.length > 0) {
        chrome.storage.local.set({ detectedCards: cards });
        return;
      }
    }
    
    // 3. Fallback: Parse currently active card accountId from the browser URL
    const urlMatch = window.location.href.match(/accountId=([^&]+)/);
    if (urlMatch) {
      const currentId = urlMatch[1];
      
      // Find actual visual name of card
      const cardName = getActiveCardNameOnPage() || `Active Card (Ending in ${currentId.slice(-4)})`;
      
      chrome.storage.local.get({ detectedCards: [] }).then(data => {
        const exists = data.detectedCards.some(c => c.id === currentId);
        
        // Update name if it exists but was a placeholder, or add new card
        let updated = [...data.detectedCards];
        if (exists) {
          updated = updated.map(c => {
            if (c.id === currentId && c.name.startsWith('Active Card (Ending')) {
              return { ...c, name: cardName };
            }
            return c;
          });
        } else {
          updated.push({
            name: cardName,
            id: currentId
          });
        }
        chrome.storage.local.set({ detectedCards: updated });
      });
    }
  } catch (err) {
    console.log("[OfferSweep] scanCardAccounts failed due to context invalidation.");
  }
}

// Scans the page and counts the number of available unadded offers
function scanUnaddedOffers() {
  if (!isContextValid()) return;

  try {
    const btns = [...document.querySelectorAll('.offerTileGridItemContainer')];
    
    const unaddedCount = btns.filter(b => {
      const text = b.innerText.toLowerCase();
      const html = b.innerHTML.toLowerCase();
      const alreadyAdded = 
        text.includes('added') || html.includes('added') ||
        text.includes('saved') || html.includes('saved') ||
        text.includes('activated') || html.includes('activated') ||
        text.includes('view offer') || html.includes('view offer') ||
        html.includes('checkmark');

      return !alreadyAdded;
    }).length;

    chrome.storage.local.get({ automationActive: false }).then(state => {
      if (!state.automationActive) {
        chrome.storage.local.set({ totalDetected: unaddedCount });
      }
    });
  } catch (err) {
    console.log("[OfferSweep] scanUnaddedOffers failed due to context invalidation.");
  }
}

// Helper to get a stable fingerprint of an offer tile (stripping ephemeral tags like NEW)
const getOfferFingerprint = (innerText) => {
  const skipWords = ['new', 'expires soon', 'expiring soon', 'expiring today', 'expires today', 'added', 'added to card', 'view offer'];
  const lines = innerText.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !skipWords.includes(l.toLowerCase()));
  return lines.join(' ').toLowerCase().replace(/\s+/g, ' ');
};

// Periodically scan for eligible card options and available offer counts on portal pages
const scanIntervalId = setInterval(() => {
  if (!isContextValid()) {
    console.log("[OfferSweep] Context invalidated. Clearing intervals...");
    clearInterval(scanIntervalId);
    return;
  }
  
  try {
    scanCardAccounts();
    scanUnaddedOffers();
  } catch (err) {
    if (err.message.includes('context invalidated')) {
      clearInterval(scanIntervalId);
    }
  }
}, 2500);

// Run immediate scans upon injection to populate popup dashboard instantly
if (isContextValid()) {
  scanCardAccounts();
  scanUnaddedOffers();
}

// Main Automation State Machine
async function runAutomation() {
  while (isRunning) {
    if (!isContextValid()) {
      isRunning = false;
      break;
    }

    try {
      // 1. Fetch current settings and progress from storage
      const state = await chrome.storage.local.get({
        automationActive: false,
        lastAction: 'back',
        minDelay: 100,
        maxDelay: 300,
        processedCount: 0,
        totalDetected: 0,
        processedOffers: []
      });

      // If disabled in storage, exit the loop
      if (!state.automationActive) {
        isRunning = false;
        await log("Automation stopped.");
        break;
      }

      const minDelay = state.minDelay !== undefined ? state.minDelay : 100;
      const maxDelay = state.maxDelay !== undefined ? state.maxDelay : 300;

      // 2. Action Selector
      if (state.lastAction === 'clicked') {
        // PHASE 2: GO BACK
        await log("Navigating back to offers list...");
        await chrome.storage.local.set({ status: 'Returning to list...' });
        
        window.history.back();
        
        // Update state to 'back' and trigger delay
        await chrome.storage.local.set({ lastAction: 'back' });
        
        const delay = getRandomDelay(minDelay, maxDelay);
        await sleep(delay);
        
      } else {
        // PHASE 1: CLICK TARGET CARD
        const btns = [...document.querySelectorAll('.offerTileGridItemContainer')];
        
        // Filter out offers already added or processed in this run
        const unaddedButtons = btns.filter(b => {
          const text = b.innerText.toLowerCase();
          const html = b.innerHTML.toLowerCase();
          
          // Comprehensive check for already added/saved/activated offers
          const alreadyAdded = 
            text.includes('added') || html.includes('added') ||
            text.includes('saved') || html.includes('saved') ||
            text.includes('activated') || html.includes('activated') ||
            text.includes('view offer') || html.includes('view offer') ||
            html.includes('checkmark');

          if (alreadyAdded) {
            return false;
          }
          
          // Skip if processed in this session to prevent infinite loops
          const fingerprint = getOfferFingerprint(b.innerText);
          if (state.processedOffers.includes(fingerprint)) {
            return false;
          }
          
          return true;
        });

        if (unaddedButtons.length === 0) {
          // No unadded buttons visible.
          if (retryCount < maxRetries) {
            retryCount++;
            const retryMsg = `Waiting for offers to load... (Retry ${retryCount}/${maxRetries})`;
            await chrome.storage.local.set({ status: retryMsg });
            await sleep(1200); // Wait slightly longer for page construction/routing
          } else {
            // Completed! All offers added or none left.
            isRunning = false;
            await chrome.storage.local.set({
              automationActive: false,
              status: 'Completed!',
              lastAction: 'back'
            });
            await log("Success! All available offers have been added.");
            showToast("Successfully added all available offers!", "success");
            break;
          }
        } else {
          // We found unadded offers! Reset retry count.
          retryCount = 0;

          // Pop the last available offer container
          const b = unaddedButtons.pop();
          if (b && b.childNodes[0]) {
            // Extract nice merchant name and fingerprint
            const fingerprint = getOfferFingerprint(b.innerText);
            const lines = b.innerText.split('\n')
              .map(l => l.trim())
              .filter(l => l.length > 0 && !['new', 'expires soon', 'expiring soon', 'expiring today', 'expires today'].includes(l.toLowerCase()));
            const merchant = lines[0] || 'Merchant Offer';
            const reward = lines[1] || 'Discount';

            // Apply beautiful golden pulse highlight to target element
            b.classList.add('ag-active-card');
            
            await log(`Targeting Offer: "${merchant} - ${reward}"`);
            await chrome.storage.local.set({
              status: `Adding "${merchant}"...`
            });
            
            // Show non-intrusive toast in the page
            showToast(`Activating offer: ${merchant}`, 'info');

            // Brief delay to let user visually appreciate the selection
            await sleep(450);

            // Remove the class right before clicking or navigating
            b.classList.remove('ag-active-card');
            b.classList.add('ag-processed');

            // Update storage before click in case navigation starts immediately
            const newProcessed = [...state.processedOffers, fingerprint];
            
            // Dynamically scale UP the total detected count if more offers lazy-load later
            const currentTotal = unaddedButtons.length + state.processedCount + 1; // include current
            const nextTotal = Math.max(state.totalDetected, currentTotal);

            await chrome.storage.local.set({
              processedOffers: newProcessed,
              processedCount: state.processedCount + 1,
              totalDetected: nextTotal,
              lastAction: 'clicked'
            });

            // Perform click on child node
            b.childNodes[0].click();

            // Wait a random delay before next tick
            const delay = getRandomDelay(minDelay, maxDelay);
            await sleep(delay);
          } else {
            // Fallback if child node missing
            await log("Failed to click offer tile: Invalid node structure.");
            await sleep(1000);
          }
        }
      }
    } catch (loopErr) {
      console.log("[OfferSweep] Loop error (context likely invalidated). stopping loop.");
      isRunning = false;
    }
  }
}

// Listen for state changes in storage
if (isContextValid()) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (!isContextValid()) return;
    if (areaName === 'local' && changes.automationActive) {
      const active = changes.automationActive.newValue;
      if (active && !isRunning) {
        isRunning = true;
        retryCount = 0;
        log("Automation activated via popup.");
        runAutomation();
      } else if (!active && isRunning) {
        isRunning = false;
        log("Automation paused.");
      }
    }
  });
}

// Resume on load if the storage state indicates running
if (isContextValid()) {
  chrome.storage.local.get({ automationActive: false }).then((data) => {
    if (!isContextValid()) return;
    if (data.automationActive) {
      isRunning = true;
      retryCount = 0;
      log("Resuming active automation session.");
      runAutomation();
    }
  });
}

// Respond to handshake pings from the popup controller
if (isContextValid()) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!isContextValid()) return;
    if (message.action === 'ping') {
      sendResponse({ action: 'pong' });
    }
    return true; // Keep channel open
  });
}
