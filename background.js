/**
 * CleanURLs Background Script (Service Worker)
 * Handles extension lifecycle and communication between components
 */

// Default rules for common tracking parameters
const DEFAULT_RULES = [
    { pattern: "forcedownload", replacement: "" },
    { pattern: "download", replacement: "" },
];

class CleanURLsBackground {
    constructor() {
        this.initializeExtension();
        this.setupEventListeners();
    }

    /**
     * Initialize the extension on startup
     */
    async initializeExtension() {
        console.log("CleanURLs: Background script started");

        try {
            // Check if this is the first install
            const { rules, isFirstInstall } = await chrome.storage.sync.get({
                rules: [],
                isFirstInstall: true,
            });

            // Set default rules on first install
            if (isFirstInstall && rules.length === 0) {
                await chrome.storage.sync.set({
                    rules: DEFAULT_RULES,
                    isFirstInstall: false,
                });
                console.log("CleanURLs: Default rules installed");
            }

            // Update badge with rule count
            this.updateBadge(rules.length);
        } catch (error) {
            console.error("CleanURLs: Initialization error:", error);
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
        console.log("CleanURLs: Install event:", details.reason);

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
                console.log(`CleanURLs: Updated to version ${currentVersion}`);
                break;
        }
    }

    /**
     * Handle storage changes
     */
    async handleStorageChange(changes, namespace) {
        if (namespace === "sync" && changes.rules) {
            const newRules = changes.rules.newValue || [];
            this.updateBadge(newRules.length);

            // Notify all content scripts about rule changes
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
                console.warn("CleanURLs: Error notifying tabs:", error);
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
                console.warn(
                    "CleanURLs: Failed to inject content script:",
                    injectionError
                );
            }
        }
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
            console.error("CleanURLs: Message handling error:", error);
            sendResponse({ error: error.message });
        }
    }

    /**
     * Update extension badge with rule count
     */
    updateBadge(ruleCount) {
        const text = ruleCount > 0 ? ruleCount.toString() : "";
        const color = ruleCount > 0 ? "#4CAF50" : "#9E9E9E";

        chrome.action.setBadgeText({ text });
        chrome.action.setBadgeBackgroundColor({ color });
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
            console.error("CleanURLs: Stats error:", error);
            return { error: error.message };
        }
    }
}

// Initialize the background script
const cleanURLsBackground = new CleanURLsBackground();

// Handle service worker lifecycle
self.addEventListener("install", (event) => {
    console.log("CleanURLs: Service worker installing");
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    console.log("CleanURLs: Service worker activating");
    event.waitUntil(self.clients.claim());
});
