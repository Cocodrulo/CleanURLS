# 🧹 CleanURLs - Chrome Extension

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://chrome.google.com/webstore)

**CleanURLs** is a powerful Chrome extension that automatically removes tracking parameters and cleans URLs as you browse, protecting your privacy and making URLs more readable.

## ✨ Features

-   🔒 **Privacy Protection**: Automatically removes tracking parameters like `utm_*`, `fbclid`, `gclid`, and more
-   ⚙️ **Customizable Rules**: Configure your own regex patterns and replacements
-   🔄 **Real-time Cleaning**: Cleans URLs as you navigate and as new links are added to pages
-   🎯 **Smart Detection**: Works on both URL parameters and values
-   🚀 **Lightweight**: Minimal performance impact with efficient processing
-   🌐 **Universal**: Works on all websites

## 🚀 Installation

### Method 1: Chrome Web Store (Recommended)

_Coming soon - extension will be published to the Chrome Web Store_

### Method 2: Manual Installation (Developer Mode)

1. **Download the extension**

    ```bash
    git clone https://github.com/Cocodrulo/CleanURLS.git
    ```

2. **Open Chrome Extensions page**

    - Navigate to `chrome://extensions/`
    - Or go to Menu → More Tools → Extensions

3. **Enable Developer Mode**

    - Toggle the "Developer mode" switch in the top-right corner

4. **Load the extension**

    - Click "Load unpacked"
    - Select the `CleanURLS` folder you downloaded

5. **Configure rules** (Optional)
    - Click on the extension options
    - Add custom rules as needed

## ⚙️ Configuration

### Default Rules

The extension comes with pre-configured rules to remove common tracking parameters:

-   `utm_*` (Google Analytics)
-   `fbclid` (Facebook)
-   `gclid` (Google Ads)
-   `msclkid` (Microsoft Ads)
-   `ref` and `referrer`
-   And many more...

### Custom Rules

Access the options page to create your own cleaning rules:

1. **Regex Pattern**: A regular expression that matches parameter names or values
2. **Replacement**:
    - Leave empty to remove the parameter entirely
    - Enter text to replace the parameter value

#### Example Rules

| Pattern     | Replacement | Description                        |
| ----------- | ----------- | ---------------------------------- |
| `utm_.*`    | _(empty)_   | Remove all UTM tracking parameters |
| `fbclid`    | _(empty)_   | Remove Facebook click identifier   |
| `ref`       | _(empty)_   | Remove referrer parameters         |
| `sessionid` | `cleaned`   | Replace session ID with 'cleaned'  |

## 🛡️ Privacy

-   **No Data Collection**: This extension does not collect, store, or transmit any personal data
-   **Local Processing**: All URL cleaning happens locally in your browser
-   **Open Source**: Full source code is available for review
-   **Minimal Permissions**: Only requests necessary permissions for functionality

## 🔧 How It Works

1. **Page Load**: When you visit a page, the extension checks the current URL
2. **URL Cleaning**: If tracking parameters are found, the URL is cleaned and the page redirects
3. **Link Monitoring**: The extension monitors for new links added to the page
4. **Real-time Updates**: Links are cleaned as they appear, ensuring privacy protection

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## 🐛 Issues & Support

If you encounter any issues or have suggestions for improvements:

-   [Report bugs](https://github.com/Cocodrulo/CleanURLS/issues)
-   [Request features](https://github.com/Cocodrulo/CleanURLS/issues)
-   [View documentation](https://github.com/Cocodrulo/CleanURLS/wiki)

## 📊 Changelog

### v1.3.1 (Latest)

-   🔄 **NEW**: Badge counter now updates when switching between tabs
-   📊 Added per-tab badge counting system
-   🎯 Badge shows cleaned links count specific to the current active tab
-   🔧 Added "tabs" permission for proper tab event handling
-   ⚡ Improved badge responsiveness and user experience

### v1.3.0

-   🎯 **NEW**: Badge now shows cleaned links count instead of rules count
-   🧹 Removed all debug console logging for production release
-   🔧 Fixed initialization timing issues with link cleaning
-   ⚡ Improved performance and reliability
-   🎨 Enhanced user experience with real-time badge updates
-   🔄 Added proper error handling and fallbacks

### v1.2.0

-   Added badge counter toggle option
-   Implemented minimalistic dark/light mode styling
-   Added cleaned links counter in popup
-   Removed unnecessary logging and debugging code
-   Streamlined extension settings interface
-   Performance improvements and code cleanup

### v1.1.0

-   Enhanced UI with modern design
-   Improved rule management
-   Better error handling
-   Performance optimizations

### v1.0.1

-   Added custom regex pattern support
-   Improved options interface
-   Bug fixes and stability improvements

### v1.0.0

-   Initial release
-   Basic URL parameter cleaning
-   Configurable rules system
