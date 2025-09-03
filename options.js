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

let currentRules = [];
let settings = {
    showBadge: true,
};

// Show toast notification
function showToast(message, type = "success") {
    // Remove existing toast
    const existingToast = document.querySelector(".toast");
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Show toast
    setTimeout(() => toast.classList.add("show"), 100);

    // Hide toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Validate regex pattern
function isValidRegex(pattern) {
    try {
        new RegExp(pattern);
        return true;
    } catch (e) {
        return false;
    }
}

// Create rule item HTML
function createRuleItem(rule, index) {
    const div = document.createElement("div");
    div.className = "rule-item";
    div.innerHTML = `
        <div class="rule-inputs">
            <div class="input-group">
                <label for="pattern-${index}">Regex Pattern</label>
                <input 
                    type="text" 
                    id="pattern-${index}"
                    class="pattern" 
                    value="${rule.pattern || ""}" 
                    placeholder="e.g., utm_.* or fbclid"
                    title="Regular expression to match parameter names or values"
                >
            </div>
            <div class="input-group">
                <label for="replacement-${index}">Replacement</label>
                <input 
                    type="text" 
                    id="replacement-${index}"
                    class="replacement" 
                    value="${rule.replacement || ""}" 
                    placeholder="Leave empty to remove parameter"
                    title="Leave empty to remove parameter, or enter replacement value"
                >
            </div>
            <button class="btn btn-danger remove-rule" onclick="removeRule(${index})" title="Remove this rule">
                🗑️
            </button>
        </div>
    `;
    return div;
}

// Render all rules
function renderRules(rules) {
    const container = document.getElementById("rules-container");
    container.innerHTML = "";

    if (rules.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                <h3>No custom rules yet</h3>
                <p>Click "Add New Rule" to create your first custom URL cleaning rule</p>
            </div>
        `;
        return;
    }

    rules.forEach((rule, index) => {
        container.appendChild(createRuleItem(rule, index));
    });
}

// Add new rule
function addNewRule() {
    currentRules.push({ pattern: "", replacement: "" });
    renderRules(currentRules);

    // Focus on the new rule's pattern input
    const newIndex = currentRules.length - 1;
    const newPatternInput = document.getElementById(`pattern-${newIndex}`);
    if (newPatternInput) {
        newPatternInput.focus();
    }
}

// Remove rule
function removeRule(index) {
    if (confirm("Are you sure you want to remove this rule?")) {
        currentRules.splice(index, 1);
        renderRules(currentRules);
        showToast("Rule removed successfully", "success");
    }
}

// Load default rules
function loadDefaultRules() {
    if (currentRules.length > 0) {
        if (
            !confirm(
                "This will replace all existing rules with default ones. Continue?"
            )
        ) {
            return;
        }
    }

    currentRules = [...DEFAULT_RULES];
    renderRules(currentRules);
    showToast("Default rules loaded successfully", "success");
}

// Clear all rules
function clearAllRules() {
    if (currentRules.length === 0) {
        showToast("No rules to clear", "error");
        return;
    }

    if (
        confirm(
            "Are you sure you want to remove all rules? This cannot be undone."
        )
    ) {
        currentRules = [];
        renderRules(currentRules);
        showToast("All rules cleared", "success");
    }
}

// Save rules and settings
function saveRules() {
    // Collect current rules from form
    const patterns = Array.from(document.querySelectorAll(".pattern")).map(
        (i) => i.value.trim()
    );
    const replacements = Array.from(
        document.querySelectorAll(".replacement")
    ).map((i) => i.value.trim());

    // Validate patterns
    const invalidPatterns = [];
    patterns.forEach((pattern, index) => {
        if (pattern && !isValidRegex(pattern)) {
            invalidPatterns.push(index + 1);
        }
    });

    if (invalidPatterns.length > 0) {
        showToast(
            `Invalid regex patterns in rules: ${invalidPatterns.join(", ")}`,
            "error"
        );
        return;
    }

    // Filter out empty patterns
    const validRules = patterns
        .map((pattern, index) => ({
            pattern: pattern,
            replacement: replacements[index] || "",
        }))
        .filter((rule) => rule.pattern.length > 0);

    // Save to storage (both rules and settings)
    chrome.storage.sync.set(
        {
            rules: validRules,
            showBadge: settings.showBadge,
        },
        () => {
            if (chrome.runtime.lastError) {
                showToast(
                    "Error saving: " + chrome.runtime.lastError.message,
                    "error"
                );
            } else {
                currentRules = validRules;
                renderRules(currentRules);
                showToast(
                    `Successfully saved ${validRules.length} rule(s)`,
                    "success"
                );
            }
        }
    );
}

// Toggle badge
function toggleBadge() {
    settings.showBadge = !settings.showBadge;
    updateBadgeToggle();

    // Auto-save when toggling
    chrome.storage.sync.set(
        {
            showBadge: settings.showBadge,
        },
        () => {
            const status = settings.showBadge ? "enabled" : "disabled";
            showToast(`Badge ${status}`, "success");

            // Send message to background script to update badge immediately
            chrome.runtime.sendMessage({
                action: "updateBadge",
                showBadge: settings.showBadge,
            });
        }
    );
}

// Update badge toggle UI
function updateBadgeToggle() {
    const toggle = document.getElementById("badge-toggle");
    if (toggle) {
        if (settings.showBadge) {
            toggle.classList.add("active");
        } else {
            toggle.classList.remove("active");
        }
    }
}

// Event listeners
document.addEventListener("DOMContentLoaded", function () {
    // Load existing rules and settings
    chrome.storage.sync.get(
        {
            rules: [],
            showBadge: true,
        },
        (data) => {
            currentRules = data.rules || [];
            settings.showBadge =
                data.showBadge !== undefined ? data.showBadge : true;

            // If no rules exist, show default rules as suggestion
            if (currentRules.length === 0) {
                currentRules = [...DEFAULT_RULES];
            }

            renderRules(currentRules);
            updateBadgeToggle();
        }
    );

    // Button event listeners
    document.getElementById("addRule").addEventListener("click", addNewRule);
    document
        .getElementById("addDefaults")
        .addEventListener("click", loadDefaultRules);
    document
        .getElementById("clearAll")
        .addEventListener("click", clearAllRules);
    document.getElementById("save").addEventListener("click", saveRules);

    // Badge toggle event listener
    document
        .getElementById("badge-toggle")
        .addEventListener("click", toggleBadge);

    // Keyboard shortcuts
    document.addEventListener("keydown", function (e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case "s":
                    e.preventDefault();
                    saveRules();
                    break;
                case "n":
                    e.preventDefault();
                    addNewRule();
                    break;
            }
        }
    });

    // Auto-save on input change (debounced)
    let autoSaveTimeout;
    document.addEventListener("input", function (e) {
        if (e.target.matches(".pattern") || e.target.matches(".replacement")) {
            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(() => {
                // Update currentRules array
                const patterns = Array.from(
                    document.querySelectorAll(".pattern")
                ).map((i) => i.value.trim());
                const replacements = Array.from(
                    document.querySelectorAll(".replacement")
                ).map((i) => i.value.trim());

                currentRules = patterns
                    .map((pattern, index) => ({
                        pattern: pattern,
                        replacement: replacements[index] || "",
                    }))
                    .filter((rule) => rule.pattern.length > 0);
            }, 500);
        }
    });
});

// Make removeRule available globally
window.removeRule = removeRule;
