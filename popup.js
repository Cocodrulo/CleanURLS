/**
 * CleanURLs Popup Script
 * Handles the popup interface for quick access and controls
 */

class PopupController {
    constructor() {
        this.isLoading = true;
        this.stats = {
            rulesCount: 0,
            activeTabs: 0,
            version: "1.3.1",
        };
        this.currentTabStats = {
            cleanedLinksCount: 0,
            domain: "unknown",
        };
        this.init();
    }

    /**
     * Initialize the popup
     */
    async init() {
        try {
            await this.loadStats();
            await this.loadCurrentTabStats();
            this.setupEventListeners();
            this.updateUI();
            this.hideLoading();
        } catch (error) {
            this.showError("Failed to load extension data");
        }
    }

    /**
     * Load extension statistics
     */
    async loadStats() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: "getStats" }, (response) => {
                if (response && !response.error) {
                    this.stats = { ...this.stats, ...response };
                }
                resolve();
            });
        });
    }

    /**
     * Load current tab statistics
     */
    async loadCurrentTabStats() {
        return new Promise((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]?.id) {
                    // Add a small delay to ensure content script is ready
                    setTimeout(() => {
                        chrome.runtime.sendMessage(
                            {
                                action: "getCurrentTabStats",
                                tabId: tabs[0].id,
                            },
                            (response) => {
                                if (response && !response.error) {
                                    this.currentTabStats = response;
                                } else {
                                    // Fallback values
                                    this.currentTabStats = {
                                        cleanedLinksCount: 0,
                                        domain: "unknown",
                                    };
                                }
                                resolve();
                            }
                        );
                    }, 100);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Open options page
        document
            .getElementById("open-options")
            .addEventListener("click", () => {
                this.openOptions();
            });

        // Reload rules
        document
            .getElementById("reload-rules")
            .addEventListener("click", () => {
                this.reloadRules();
            });

        // Reset to defaults
        document
            .getElementById("reset-defaults")
            .addEventListener("click", () => {
                this.resetToDefaults();
            });

        // Listen for storage changes to update UI
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === "sync" && changes.rules) {
                this.loadStats().then(() => this.updateUI());
            }
        });
    }

    /**
     * Update the UI with current stats
     */
    updateUI() {
        // Update rule count
        document.getElementById("rules-count").textContent =
            this.stats.rulesCount || 0;

        // Update current website cleaned links count
        document.getElementById("tabs-count").textContent =
            this.currentTabStats.cleanedLinksCount || 0;

        // Update the label for the second stat
        const tabsLabel = document.querySelector(
            ".stat-item:nth-child(2) .stat-label"
        );
        if (tabsLabel) {
            tabsLabel.textContent = "Cleaned Links";
        }

        // Show domain info if available
        const domainInfo = document.getElementById("domain-info");
        if (
            domainInfo &&
            this.currentTabStats.domain &&
            this.currentTabStats.domain !== "unknown"
        ) {
            domainInfo.textContent = `on ${this.currentTabStats.domain}`;
            domainInfo.style.display = "block";
        } else if (domainInfo) {
            domainInfo.style.display = "none";
        }

        // Update version
        document.getElementById("version").textContent =
            this.stats.version || "1.3.1";

        // Update status
        const statusElement = document.getElementById("status");
        if (this.stats.rulesCount > 0) {
            statusElement.className = "status active";
            statusElement.innerHTML = `
                <strong>🟢 Active</strong><br>
                Protecting your privacy with ${this.stats.rulesCount} rule(s)`;
        } else {
            statusElement.className = "status inactive";
            statusElement.innerHTML = `
                <strong>🟡 No Rules</strong><br>
                Click "Configure Rules" to set up URL cleaning`;
        }

        // Show domain info if available
        if (
            this.currentTabStats.domain &&
            this.currentTabStats.domain !== "unknown"
        ) {
            const domainInfo = document.getElementById("domain-info");
            if (domainInfo) {
                domainInfo.textContent = `on ${this.currentTabStats.domain}`;
                domainInfo.style.display = "block";
            }
        }
    }

    /**
     * Hide loading screen and show main content
     */
    hideLoading() {
        document.getElementById("loading").style.display = "none";
        document.getElementById("main-content").style.display = "block";
        this.isLoading = false;
    }

    /**
     * Show error message
     */
    showError(message) {
        const loadingElement = document.getElementById("loading");
        loadingElement.innerHTML = `
            <div style="color: #dc3545; text-align: center;">
                ❌ ${message}
            </div>
        `;
    }

    /**
     * Open options page
     */
    openOptions() {
        chrome.runtime.sendMessage({ action: "openOptions" }, () => {
            window.close();
        });
    }

    /**
     * Reload rules in all tabs
     */
    async reloadRules() {
        const reloadButton = document.getElementById("reload-rules");
        const originalText = reloadButton.innerHTML;

        // Show loading state
        reloadButton.innerHTML =
            '<div class="spinner" style="width: 16px; height: 16px; margin-right: 5px;"></div>Reloading...';
        reloadButton.disabled = true;

        try {
            // Get all tabs
            const tabs = await chrome.tabs.query({});

            // Send reload message to all content scripts
            const promises = tabs
                .filter(
                    (tab) =>
                        tab.url &&
                        (tab.url.startsWith("http") ||
                            tab.url.startsWith("https"))
                )
                .map(
                    (tab) =>
                        chrome.tabs
                            .sendMessage(tab.id, { action: "reloadConfig" })
                            .catch(() => {}) // Ignore errors for tabs without content script
                );

            await Promise.all(promises);

            // Refresh current tab stats
            await this.loadCurrentTabStats();
            this.updateUI();

            // Show success feedback
            reloadButton.innerHTML = "✅ Reloaded!";
            setTimeout(() => {
                reloadButton.innerHTML = originalText;
                reloadButton.disabled = false;
            }, 1500);
        } catch (error) {
            reloadButton.innerHTML = "❌ Failed";
            setTimeout(() => {
                reloadButton.innerHTML = originalText;
                reloadButton.disabled = false;
            }, 1500);
        }
    }

    /**
     * Reset rules to defaults
     */
    resetToDefaults() {
        if (
            confirm(
                "This will replace all current rules with default ones. Continue?"
            )
        ) {
            const resetButton = document.getElementById("reset-defaults");
            const originalText = resetButton.innerHTML;

            resetButton.innerHTML =
                '<div class="spinner" style="width: 16px; height: 16px; margin-right: 5px;"></div>Resetting...';
            resetButton.disabled = true;

            chrome.runtime.sendMessage(
                { action: "resetToDefaults" },
                (response) => {
                    if (response && response.success) {
                        resetButton.innerHTML = "✅ Reset!";
                        this.loadStats().then(() => this.updateUI());
                    } else {
                        resetButton.innerHTML = "❌ Failed";
                    }

                    setTimeout(() => {
                        resetButton.innerHTML = originalText;
                        resetButton.disabled = false;
                    }, 1500);
                }
            );
        }
    }
}

// Initialize popup when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    new PopupController();
});
