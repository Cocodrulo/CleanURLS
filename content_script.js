/**
 * CleanURLs Content Script
 * Monitors and cleans URLs on web pages to remove tracking parameters
 */

class URLCleaner {
    constructor() {
        this.configRules = [];
        this.isInitialized = false;
        this.observer = null;
        this.processedUrls = new Set();
        this.cleanedLinksCount = 0;
        this.init();
    }

    /**
     * Initialize the URL cleaner
     */
    async init() {
        try {
            // Wait a bit for the background script to set up storage
            await new Promise((resolve) => setTimeout(resolve, 100));

            await this.loadConfig();

            // If no rules loaded, request them from background script
            if (this.configRules.length === 0) {
                await this.requestRulesFromBackground();
            }

            // Mark as initialized FIRST
            this.isInitialized = true;

            // Now clean existing links and start observing
            this.handleCurrentLocation(); // Non-blocking
            this.cleanAllLinks();
            this.startObserver();
        } catch (error) {
            // If initialization fails, try again after a delay
            setTimeout(() => this.init(), 1000);
        }
    }

    /**
     * Request rules from background script
     */
    async requestRulesFromBackground() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: "getRules",
            });
            if (response && response.rules && response.rules.length > 0) {
                this.configRules = response.rules.map((rule) => ({
                    pattern: new RegExp(rule.pattern, "i"),
                    replacement: rule.replacement || "",
                    originalPattern: rule.pattern,
                }));
            }
        } catch (error) {
            // Silent error handling
        }
    }

    /**
     * Load configuration rules from storage
     */
    loadConfig() {
        return new Promise((resolve) => {
            chrome.storage.sync.get({ rules: [] }, (data) => {
                try {
                    let rules = data.rules;

                    // If no rules loaded, use basic defaults
                    if (!rules || rules.length === 0) {
                        rules = [
                            { pattern: "utm_.*", replacement: "" },
                            { pattern: "fbclid", replacement: "" },
                            { pattern: "gclid", replacement: "" },
                            { pattern: "ref", replacement: "" },
                            { pattern: "forcedownload", replacement: "" },
                            { pattern: "download", replacement: "" },
                        ];
                    }

                    this.configRules = rules.map((rule) => ({
                        pattern: new RegExp(rule.pattern, "i"),
                        replacement: rule.replacement || "",
                        originalPattern: rule.pattern,
                    }));
                } catch (error) {
                    // Fallback to basic rules if mapping fails
                    this.configRules = [
                        {
                            pattern: /utm_.*/i,
                            replacement: "",
                            originalPattern: "utm_.*",
                        },
                        {
                            pattern: /fbclid/i,
                            replacement: "",
                            originalPattern: "fbclid",
                        },
                        {
                            pattern: /gclid/i,
                            replacement: "",
                            originalPattern: "gclid",
                        },
                        {
                            pattern: /forcedownload/i,
                            replacement: "",
                            originalPattern: "forcedownload",
                        },
                        {
                            pattern: /download/i,
                            replacement: "",
                            originalPattern: "download",
                        },
                    ];
                }
                resolve();
            });
        });
    }

    /**
     * Clean a URL string by applying all configured rules
     */
    cleanUrlString(urlStr) {
        if (!urlStr || this.processedUrls.has(urlStr)) {
            return urlStr;
        }

        try {
            const url = new URL(urlStr, location.href);
            let hasChanges = false;

            // Create a copy of search params to iterate over
            const paramsToProcess = Array.from(url.searchParams.entries());

            for (const [key, value] of paramsToProcess) {
                for (const rule of this.configRules) {
                    try {
                        // Test against parameter name or value
                        if (
                            rule.pattern.test(key) ||
                            rule.pattern.test(value)
                        ) {
                            if (rule.replacement === "") {
                                url.searchParams.delete(key);
                                hasChanges = true;
                            } else {
                                url.searchParams.set(key, rule.replacement);
                                hasChanges = true;
                            }
                            break; // Stop after first matching rule
                        }
                    } catch (regexError) {
                        // Silent error handling
                    }
                }
            }

            const cleanedUrl = url.toString();

            if (hasChanges) {
                this.processedUrls.add(urlStr);
                this.processedUrls.add(cleanedUrl);
            }

            return cleanedUrl;
        } catch (error) {
            return urlStr;
        }
    }

    /**
     * Clean all links on the page
     */
    cleanAllLinks(root = document) {
        if (!this.isInitialized) return;

        const anchors = root.querySelectorAll("a[href]");
        let cleanedCount = 0;

        anchors.forEach((anchor) => {
            const originalHref = anchor.getAttribute("href");
            if (!originalHref) return;

            const cleanedHref = this.cleanUrlString(originalHref);
            if (cleanedHref !== originalHref) {
                anchor.setAttribute("href", cleanedHref);
                cleanedCount++;
            }
        });

        if (cleanedCount > 0) {
            this.cleanedLinksCount += cleanedCount;
            // Update badge with total cleaned links count
            this.updateBadge();
        }
    }

    /**
     * Handle the current page location (currently disabled)
     */
    async handleCurrentLocation() {
        // Temporarily disabled to avoid page redirect issues
        // This feature can be re-enabled later with proper user consent
        return;
    }

    /**
     * Start observing DOM changes to clean new links
     */
    startObserver() {
        if (this.observer) {
            this.observer.disconnect();
        }

        this.observer = new MutationObserver((mutations) => {
            let hasNewLinks = false;

            for (const mutation of mutations) {
                if (mutation.addedNodes && mutation.addedNodes.length) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType !== Node.ELEMENT_NODE) continue;

                        // Check if the node itself is a link
                        if (node.matches && node.matches("a[href]")) {
                            this.cleanSingleLink(node);
                            hasNewLinks = true;
                        }

                        // Check for links within the node
                        if (node.querySelectorAll) {
                            const subAnchors = node.querySelectorAll("a[href]");
                            if (subAnchors.length > 0) {
                                subAnchors.forEach((anchor) =>
                                    this.cleanSingleLink(anchor)
                                );
                                hasNewLinks = true;
                            }
                        }
                    }
                }

                // Also handle attribute changes on existing links
                if (
                    mutation.type === "attributes" &&
                    mutation.attributeName === "href" &&
                    mutation.target.matches("a[href]")
                ) {
                    this.cleanSingleLink(mutation.target);
                }
            }

            if (hasNewLinks) {
                // Update badge after processing new links
                this.updateBadge();
            }
        });

        this.observer.observe(document.documentElement || document, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["href"],
        });
    }

    /**
     * Clean a single link element
     */
    cleanSingleLink(anchor) {
        if (!this.isInitialized) return;

        const originalHref = anchor.getAttribute("href");
        if (!originalHref) return;

        const cleanedHref = this.cleanUrlString(originalHref);
        if (cleanedHref !== originalHref) {
            anchor.setAttribute("href", cleanedHref);
            this.cleanedLinksCount++;
            // Update badge with new total
            this.updateBadge();
        }
    }

    /**
     * Update extension badge with cleaned links count
     */
    updateBadge() {
        try {
            chrome.runtime.sendMessage({
                action: "updateBadgeCount",
                count: this.cleanedLinksCount,
            });
        } catch (error) {
            // Silent error handling
        }
    }

    /**
     * Reset cleaned links counter
     */
    resetCounter() {
        this.cleanedLinksCount = 0;
        this.updateBadge();
    }

    /**
     * Reload configuration (called when rules change)
     */
    async reloadConfig() {
        await this.loadConfig();
        this.processedUrls.clear();
        this.cleanedLinksCount = 0;
        this.cleanAllLinks();
    }

    /**
     * Cleanup when content script is unloaded
     */
    cleanup() {
        if (this.observer) {
            this.observer.disconnect();
        }
        this.processedUrls.clear();
    }
}

// Initialize the URL cleaner
const urlCleaner = new URLCleaner();

// Listen for storage changes to reload config
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "sync" && changes.rules) {
        urlCleaner.reloadConfig();
    }
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case "ping":
            sendResponse({ pong: true });
            break;
        case "reloadConfig":
            urlCleaner.reloadConfig();
            sendResponse({ success: true });
            break;
        case "resetCounter":
            urlCleaner.resetCounter();
            sendResponse({ success: true });
            break;
        case "getStats":
            sendResponse({
                rulesCount: urlCleaner.configRules.length,
                processedUrls: urlCleaner.processedUrls.size,
                cleanedLinksCount: urlCleaner.cleanedLinksCount,
                domain: location.hostname,
            });
            break;
    }
});

// Cleanup on beforeunload
window.addEventListener("beforeunload", () => {
    urlCleaner.cleanup();
});
