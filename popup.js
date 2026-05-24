// OfferSweep - Popup Controller

document.addEventListener('DOMContentLoaded', async () => {
  // Select UI Elements
  const warningBanner = document.getElementById('chase-warning');
  const btnOpenChase = document.getElementById('btn-open-chase');
  const toggleBtn = document.getElementById('btn-toggle-automation');
  const cardSelectorSection = document.getElementById('card-selector-section');
  const cardSelector = document.getElementById('card-selector');
  
  const statProcessed = document.getElementById('stat-processed');
  const statTotal = document.getElementById('stat-total');
  const statusDetail = document.getElementById('status-detail');
  const progressBar = document.getElementById('progress-bar');
  
  const statusBadge = document.getElementById('status-badge');
  const statusDot = document.getElementById('status-dot');
  const statusIndicator = statusDot.parentElement;
  
  const sliderMin = document.getElementById('slider-min-delay');
  const sliderMax = document.getElementById('slider-max-delay');
  const badgeMin = document.getElementById('badge-min-delay');
  const badgeMax = document.getElementById('badge-max-delay');
  
  const terminalLogs = document.getElementById('terminal-logs');
  const btnClearLogs = document.getElementById('btn-clear-logs');

  // 1. Tab & Page Validation
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Strictly verify if the user is on the merchant offers page
  const isChaseOffers = tab && tab.url && tab.url.includes('chase.com') && 
    (tab.url.includes('merchantOffers') || tab.url.includes('offer-hub'));

  if (!isChaseOffers) {
    // Show page navigation helper banner
    warningBanner.style.display = 'flex';
    toggleBtn.disabled = true;
    toggleBtn.style.opacity = '0.5';
    toggleBtn.style.cursor = 'not-allowed';
  } else {
    warningBanner.style.display = 'none';
    
    // Automatically check and inject content script on popup load so scanner runs immediately
    (async () => {
      let scriptActive = false;
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
        if (response && response.action === 'pong') {
          scriptActive = true;
        }
      } catch (err) {
        console.log("Content script not active on popup open, injecting...");
      }

      if (!scriptActive) {
        try {
          await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
          await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['content.css'] });
          console.log("Successfully auto-injected content script on popup open!");
        } catch (injectErr) {
          console.error("Auto-injection on popup open failed:", injectErr);
        }
      }
    })();
  }

  btnOpenChase.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://secure.chase.com/web/auth/dashboard#/dashboard/merchantOffers/offer-hub' });
  });

  // 2. Load settings and state from storage
  const state = await chrome.storage.local.get({
    automationActive: false,
    minDelay: 100,
    maxDelay: 300,
    processedCount: 0,
    totalDetected: 0,
    status: 'Ready',
    logs: [],
    detectedCards: []
  });

  // Sync sliders
  // Safety migration: automatically migrate from old 300/1300 defaults to new 100/300 defaults
  if (state.minDelay === 300 && state.maxDelay === 1300) {
    state.minDelay = 100;
    state.maxDelay = 300;
    await chrome.storage.local.set({ minDelay: 100, maxDelay: 300 });
  }

  sliderMin.value = state.minDelay;
  sliderMax.value = state.maxDelay;
  badgeMin.innerText = `${state.minDelay}ms`;
  badgeMax.innerText = `${state.maxDelay}ms`;

  // Render Initial UI State
  updateUI(state);
  renderLogs(state.logs);

  // 3. Slider Listeners (Dynamic limits & UI updates)
  sliderMin.addEventListener('input', async (e) => {
    const val = parseInt(e.target.value);
    badgeMin.innerText = `${val}ms`;
    
    // Safety check: Min delay cannot exceed Max delay
    if (val > parseInt(sliderMax.value)) {
      sliderMax.value = val;
      badgeMax.innerText = `${val}ms`;
      await chrome.storage.local.set({ minDelay: val, maxDelay: val });
    } else {
      await chrome.storage.local.set({ minDelay: val });
    }
  });

  sliderMax.addEventListener('input', async (e) => {
    const val = parseInt(e.target.value);
    badgeMax.innerText = `${val}ms`;
    
    // Safety check: Max delay cannot be less than Min delay
    if (val < parseInt(sliderMin.value)) {
      sliderMin.value = val;
      badgeMin.innerText = `${val}ms`;
      await chrome.storage.local.set({ minDelay: val, maxDelay: val });
    } else {
      await chrome.storage.local.set({ maxDelay: val });
    }
  });

  // 4. Card Account Selector Listener
  cardSelector.addEventListener('change', async (e) => {
    const selectedId = e.target.value;
    if (!selectedId) return;

    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab && activeTab.url) {
      let newUrl = activeTab.url;
      if (newUrl.includes('accountId=')) {
        newUrl = newUrl.replace(/accountId=[^&]+/, `accountId=${selectedId}`);
      } else {
        const separator = newUrl.includes('?') ? '&' : '?';
        newUrl = `${newUrl}${separator}accountId=${selectedId}`;
      }

      // Navigate active tab to selected card account
      await chrome.tabs.update(activeTab.id, { url: newUrl });

      // Update local tab url reference so UI states align
      tab.url = newUrl;

      // Reset progress metrics for a clean switch
      await chrome.storage.local.set({
        automationActive: false,
        processedCount: 0,
        totalDetected: 0,
        processedOffers: [],
        lastAction: 'back',
        status: 'Switched card. Ready.'
      });

      const timestamp = new Date().toLocaleTimeString();
      const currentLogs = (await chrome.storage.local.get({ logs: [] })).logs;
      await chrome.storage.local.set({
        logs: [...currentLogs, `[${timestamp}] [System] Switched card account. Automation reset.`].slice(-100)
      });
    }
  });

  // 5. Automation Toggle Action
  toggleBtn.addEventListener('click', async () => {
    const data = await chrome.storage.local.get({ automationActive: false });
    const nextState = !data.automationActive;

    if (nextState) {
      // START AUTOMATION
      
      // Safety check: verify active tab is still loaded and inject script if missing
      const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!currentTab || !currentTab.id) return;

      let scriptActive = false;
      try {
        const response = await chrome.tabs.sendMessage(currentTab.id, { action: 'ping' });
        if (response && response.action === 'pong') {
          scriptActive = true;
        }
      } catch (err) {
        // Content script is not listening
        console.log("Content script not active on tab. Attempting programmatic injection...");
      }

      if (!scriptActive) {
        try {
          // Programmatically inject content.js and content.css
          await chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            files: ['content.js']
          });
          await chrome.scripting.insertCSS({
            target: { tabId: currentTab.id },
            files: ['content.css']
          });
          console.log("Successfully injected content script programmatically!");
        } catch (injectErr) {
          console.error("Programmatic injection failed:", injectErr);
          // Alert user to refresh tab if we fail (e.g. extension reloads, tab security limitations)
          const timestamp = new Date().toLocaleTimeString();
          await chrome.storage.local.set({
            logs: [
              `[${timestamp}] [Warning] Dynamic injection failed.`,
              `[${timestamp}] [System] Action required: Please refresh your active card tab to activate.`
            ]
          });
          return;
        }
      }

      // Reset progress metrics and clear processed offers log to start fresh
      await chrome.storage.local.set({
        automationActive: true,
        processedCount: 0,
        totalDetected: 0,
        processedOffers: [],
        lastAction: 'back',
        status: 'Starting automation...',
        logs: [`[${new Date().toLocaleTimeString()}] [System] Initializing OfferSweep...`]
      });
    } else {
      // PAUSE AUTOMATION
      await chrome.storage.local.set({
        automationActive: false,
        status: 'Paused'
      });
      // Append manual stop log
      const timestamp = new Date().toLocaleTimeString();
      const currentLogs = (await chrome.storage.local.get({ logs: [] })).logs;
      await chrome.storage.local.set({
        logs: [...currentLogs, `[${timestamp}] [System] Automation paused by user.`].slice(-100)
      });
    }
  });

  // 5. Clear Terminal Logs
  btnClearLogs.addEventListener('click', async () => {
    await chrome.storage.local.set({ logs: [] });
    terminalLogs.innerHTML = '<div class="log-line system">[Console cleared]</div>';
  });

  // 6. Listen for real-time storage changes to update Popup elements
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      chrome.storage.local.get(null).then((latestState) => {
        updateUI(latestState);
        
        if (changes.logs) {
          renderLogs(latestState.logs);
        }
      });
    }
  });

  // Helper to re-draw active UI elements
  function updateUI(latestState) {
    const { automationActive, processedCount, totalDetected, status, detectedCards } = latestState;

    // Render Card selector if card accounts detected
    if (detectedCards && detectedCards.length > 0) {
      cardSelectorSection.style.display = 'block';
      
      // Rebuild options if empty
      if (cardSelector.options.length <= 1) {
        cardSelector.innerHTML = '<option value="">-- Choose Card Account --</option>';
        detectedCards.forEach(card => {
          const opt = document.createElement('option');
          opt.value = card.id;
          opt.innerText = card.name;
          cardSelector.appendChild(opt);
        });
      }
      
      // Sync dropdown selected value with tab's URL accountId parameter
      const urlMatch = tab && tab.url && tab.url.match(/accountId=([^&]+)/);
      if (urlMatch) {
        cardSelector.value = urlMatch[1];
      }
    } else {
      cardSelectorSection.style.display = 'none';
    }

    // Toggle button state classes
    if (automationActive) {
      toggleBtn.innerText = 'Pause Auto-Adding';
      toggleBtn.className = 'btn btn-primary-gold active';
      
      statusBadge.innerText = 'Running';
      statusDot.className = 'status-dot active';
      statusIndicator.className = 'status-indicator active';
    } else {
      toggleBtn.innerText = 'Start Auto-Adding';
      toggleBtn.className = 'btn btn-primary-gold';
      
      if (status === 'Completed!') {
        statusBadge.innerText = 'Done';
        statusDot.className = 'status-dot completed';
        statusIndicator.className = 'status-indicator completed';
      } else {
        statusBadge.innerText = 'Inactive';
        statusDot.className = 'status-dot';
        statusIndicator.className = 'status-indicator';
      }
    }

    // Update Counts & Details
    statProcessed.innerText = processedCount;
    statTotal.innerText = totalDetected;
    statusDetail.innerText = status;

    // Update Progress Bar
    if (totalDetected > 0) {
      const percentage = Math.min(100, Math.floor((processedCount / totalDetected) * 100));
      progressBar.style.width = `${percentage}%`;
    } else {
      progressBar.style.width = '0%';
    }
  }

  // Helper to re-render terminal logs
  function renderLogs(logsList) {
    if (!logsList || logsList.length === 0) {
      terminalLogs.innerHTML = '<div class="log-line system">[Console empty. Ready.]</div>';
      return;
    }

    terminalLogs.innerHTML = '';
    logsList.forEach(log => {
      const div = document.createElement('div');
      div.className = 'log-line';
      
      // Add custom highlight classes based on text context
      if (log.includes('[System]')) {
        div.classList.add('system');
      } else if (log.includes('Targeting Offer') || log.includes('Success')) {
        div.classList.add('highlight');
      }
      
      div.innerText = log;
      terminalLogs.appendChild(div);
    });

    // Auto-scroll terminal to view the most recent logs
    terminalLogs.scrollTop = terminalLogs.scrollHeight;
  }
});
