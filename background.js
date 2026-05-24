// OfferSweep - Service Worker

// Initialize default storage values upon installation
chrome.runtime.onInstalled.addListener(async () => {
  console.log("OfferSweep service worker initialized.");
  
  const existing = await chrome.storage.local.get([
    'automationActive',
    'minDelay',
    'maxDelay',
    'logs',
    'processedCount',
    'totalDetected',
    'lastAction',
    'processedOffers'
  ]);
  
  // Set defaults if they do not exist
  await chrome.storage.local.set({
    automationActive: existing.automationActive !== undefined ? existing.automationActive : false,
    minDelay: existing.minDelay !== undefined ? existing.minDelay : 100,
    maxDelay: existing.maxDelay !== undefined ? existing.maxDelay : 300,
    logs: existing.logs !== undefined ? existing.logs : ["[System] Extension initialized. Ready."],
    processedCount: existing.processedCount !== undefined ? existing.processedCount : 0,
    totalDetected: existing.totalDetected !== undefined ? existing.totalDetected : 0,
    lastAction: existing.lastAction !== undefined ? existing.lastAction : 'back',
    processedOffers: existing.processedOffers !== undefined ? existing.processedOffers : [],
    status: 'Ready'
  });
});

// Watch storage changes to toggle extension icon badge
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === 'local' && changes.automationActive) {
    const isRunning = changes.automationActive.newValue;
    if (isRunning) {
      // Set badge text to 'RUN'
      await chrome.action.setBadgeText({ text: 'ON' });
      // Set beautiful glowing gold/amber badge color
      await chrome.action.setBadgeBackgroundColor({ color: '#d4af37' });
    } else {
      // Clear badge
      await chrome.action.setBadgeText({ text: '' });
    }
  }
});
