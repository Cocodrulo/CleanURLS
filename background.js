/**
 * CleanURLs Background Script (Service Worker)
 * Handles extension lifecycle and communication between components
 */

// Default rules for common tracking parameters
const DEFAULT_RULES = [
    { pattern: "utm_.*", replacement: "" },
    { pattern: "fbclid", replacement: "" },
    { pattern: "gclid", replacement: "" },
    { pattern: "msclkid", replacement: "" },
    { pattern: "mc_eid", replacement: "" },
    { pattern: "ref_.*", replacement: "" },
    { pattern: "source", replacement: "" },
    { pattern: "campaign", replacement: "" },
    { pattern: "forcedownload", replacement: "" },
    { pattern: "download", replacement: "" },
];

class CleanURLsBackground {
    constructor() {
        this.tabCleanedLinks = new Map(); // Track cleaned links per tab ID
        this.currentActiveTabId = null; // Track the currently active tab
        this.initializeExtension();
        this.setupEventListeners();
    }

    /**
     * Initialize the extension on startup
     */
    async initializeExtension() {
        try {
            // Check if this is the first install
            const { rules, isFirstInstall, showBadge } =
                await chrome.storage.sync.get({
                    rules: [],
                    isFirstInstall: true,
                    showBadge: true,
                });

            // Always ensure we have rules - set defaults if none exist
            if (rules.length === 0) {
                await chrome.storage.sync.set({
                    rules: DEFAULT_RULES,
                    isFirstInstall: false,
                    showBadge: true,
                });
                // Update badge with 0 cleaned links initially
                this.updateBadge(0, showBadge);
            } else {
                // Update badge with 0 cleaned links initially
                this.updateBadge(0, showBadge);
            }

            // Initialize current active tab
            await this.initializeActiveTab();
        } catch (error) {
            // Fallback: set default rules if anything fails
            try {
                await chrome.storage.sync.set({
                    rules: DEFAULT_RULES,
                    isFirstInstall: false,
                    showBadge: true,
                });
                this.updateBadge(0, true);
                await this.initializeActiveTab();
            } catch (fallbackError) {
                // Silent error handling
            }
        }
    }

    /**
     * Initialize the current active tab
     */
    async initializeActiveTab() {
        try {
            const [activeTab] = await chrome.tabs.query({
                active: true,
                currentWindow: true,
            });
            if (activeTab) {
                this.currentActiveTabId = activeTab.id;
            }
        } catch (error) {
            // Silent error handling
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Handle extension install/update
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstalled(details);
        });

        // Handle storage changes
        chrome.storage.onChanged.addListener((changes, namespace) => {
            this.handleStorageChange(changes, namespace);
        });

        // Handle tab updates
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            this.handleTabUpdate(tabId, changeInfo, tab);
        });

        // Handle tab activation (switching tabs)
        chrome.tabs.onActivated.addListener((activeInfo) => {
            this.handleTabActivated(activeInfo);
        });

        // Handle tab removal
        chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
            this.handleTabRemoved(tabId);
        });

        // Handle messages from content scripts
        chrome.runtime.onMessage.addListener(
            (request, sender, sendResponse) => {
                this.handleMessage(request, sender, sendResponse);
                return true; // Keep message channel open for async response
            }
        );
    }

    /**
     * Handle extension install/update events
     */
    async handleInstalled(details) {
        switch (details.reason) {
            case "install":
                // Open options page on first install
                chrome.tabs.create({
                    url: chrome.runtime.getURL("options.html"),
                });
                break;

            case "update":
                // Handle updates if needed
                const currentVersion = chrome.runtime.getManifest().version;
                break;
        }
    }

    /**
     * Handle storage changes
     */
    async handleStorageChange(changes, namespace) {
        if (namespace === "sync") {
            // Get current state from storage to ensure we have the latest values
            const { rules, showBadge } = await chrome.storage.sync.get({
                rules: [],
                showBadge: true,
            });

            // Always update badge when storage changes
            if (changes.rules || changes.showBadge) {
                const currentTabCount = this.currentActiveTabId
                    ? this.tabCleanedLinks.get(this.currentActiveTabId) || 0
                    : 0;
                this.updateBadge(currentTabCount, showBadge);
            }

            // Notify all content scripts about rule changes
            if (changes.rules) {
                try {
                    const tabs = await chrome.tabs.query({});
                    for (const tab of tabs) {
                        if (
                            tab.url &&
                            (tab.url.startsWith("http") ||
                                tab.url.startsWith("https"))
                        ) {
                            chrome.tabs
                                .sendMessage(tab.id, { action: "reloadConfig" })
                                .catch(() => {
                                    // Ignore errors for tabs without content script
                                });
                        }
                    }
                } catch (error) {
                    // Silent error handling
                }
            }
        }
    }

    /**
     * Handle tab update events
     */
    handleTabUpdate(tabId, changeInfo, tab) {
        // Only process when the tab is completely loaded
        if (changeInfo.status === "complete" && tab.url) {
            // Inject content script if needed (for dynamically created tabs)
            this.ensureContentScript(tabId, tab.url);
        }
    }

    /**
     * Ensure content script is injected
     */
    async ensureContentScript(tabId, url) {
        if (!url || (!url.startsWith("http") && !url.startsWith("https"))) {
            return;
        }

        try {
            // Check if content script is already injected
            const response = await chrome.tabs.sendMessage(tabId, {
                action: "ping",
            });
        } catch (error) {
            // Content script not present, inject it
            try {
                await chrome.scripting.executeScript({
                    target: { tabId },
                    files: ["content_script.js"],
                });
            } catch (injectionError) {
                // Silent error handling
            }
        }
    }

    /**
     * Handle tab activation (when switching tabs)
     */
    async handleTabActivated(activeInfo) {
        this.currentActiveTabId = activeInfo.tabId;

        // Update badge for the newly active tab
        const { showBadge } = await chrome.storage.sync.get({
            showBadge: true,
        });
        const cleanedLinksCount =
            this.tabCleanedLinks.get(activeInfo.tabId) || 0;
        this.updateBadge(cleanedLinksCount, showBadge);
    }

    /**
     * Handle tab removal (cleanup)
     */
    handleTabRemoved(tabId) {
        // Clean up stored data for removed tab
        this.tabCleanedLinks.delete(tabId);
    }

    /**
     * Handle messages from content scripts and popup
     */
    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case "getRules":
                    const { rules } = await chrome.storage.sync.get({
                        rules: [],
                    });
                    sendResponse({ rules });
                    break;

                case "getStats":
                    const stats = await this.getExtensionStats();
                    sendResponse(stats);
                    break;

                case "getCurrentTabStats":
                    const tabStats = await this.getCurrentTabStats(
                        request.tabId
                    );
                    sendResponse(tabStats);
                    break;

                case "updateBadge":
                    // Handle immediate badge update from options
                    const currentTabCount = this.currentActiveTabId
                        ? this.tabCleanedLinks.get(this.currentActiveTabId) || 0
                        : 0;
                    this.updateBadge(currentTabCount, request.showBadge);
                    sendResponse({ success: true });
                    break;

                case "updateBadgeCount":
                    // Handle badge update with cleaned links count per tab
                    const tabId = sender.tab?.id;
                    if (tabId) {
                        this.tabCleanedLinks.set(tabId, request.count || 0);

                        // Only update badge if this is the currently active tab
                        if (tabId === this.currentActiveTabId) {
                            const { showBadge: badgeEnabled } =
                                await chrome.storage.sync.get({
                                    showBadge: true,
                                });
                            this.updateBadge(request.count || 0, badgeEnabled);
                        }
                    }
                    sendResponse({ success: true });
                    break;

                case "resetCleanedLinks":
                    // Reset the cleaned links counter for all tabs
                    this.tabCleanedLinks.clear();
                    const { showBadge: badgeShow } =
                        await chrome.storage.sync.get({
                            showBadge: true,
                        });
                    this.updateBadge(0, badgeShow);
                    sendResponse({ success: true });
                    break;

                case "resetToDefaults":
                    await chrome.storage.sync.set({ rules: DEFAULT_RULES });
                    sendResponse({ success: true });
                    break;

                case "openOptions":
                    chrome.tabs.create({
                        url: chrome.runtime.getURL("options.html"),
                    });
                    sendResponse({ success: true });
                    break;

                default:
                    sendResponse({ error: "Unknown action" });
            }
        } catch (error) {
            sendResponse({ error: error.message });
        }
    }

    /**
     * Update extension badge with cleaned links count
     */
    updateBadge(cleanedLinksCount, showBadge = true) {
        try {
            if (showBadge) {
                const text =
                    cleanedLinksCount > 0 ? cleanedLinksCount.toString() : "";
                const color = cleanedLinksCount > 0 ? "#4CAF50" : "#9E9E9E";

                chrome.action.setBadgeText({ text });
                chrome.action.setBadgeBackgroundColor({ color });
            } else {
                // Clear the badge completely when disabled
                chrome.action.setBadgeText({ text: "" });
                chrome.action.setBadgeBackgroundColor({ color: "#9E9E9E" });
            }
        } catch (error) {
            // Silent error handling for badge API issues
        }
    }

    /**
     * Get extension statistics
     */
    async getExtensionStats() {
        try {
            const { rules } = await chrome.storage.sync.get({ rules: [] });
            const tabs = await chrome.tabs.query({});
            const activeTabs = tabs.filter(
                (tab) =>
                    tab.url &&
                    (tab.url.startsWith("http") || tab.url.startsWith("https"))
            ).length;

            return {
                rulesCount: rules.length,
                activeTabs,
                version: chrome.runtime.getManifest().version,
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Get current tab statistics
     */
    async getCurrentTabStats(tabId) {
        if (!tabId) return { error: "No tab ID provided" };

        try {
            const response = await chrome.tabs.sendMessage(tabId, {
                action: "getStats",
            });
            return response || { cleanedLinksCount: 0, domain: "unknown" };
        } catch (error) {
            return { cleanedLinksCount: 0, domain: "unknown" };
        }
    }
}

// Initialize the background script
const cleanURLsBackground = new CleanURLsBackground();

// Handle service worker lifecycle
self.addEventListener("install", (event) => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});
