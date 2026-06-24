# Advanced Passkeys for Secure Login

**Eliminate weak passwords and brute-force attacks. Secure your WordPress site with native, biometric passwordless passkey login using Face ID, Touch ID, Windows Hello, and hardware security keys.**

[![WordPress tested up to 6.9](https://img.shields.io/badge/WordPress-6.9-3858e9?logo=wordpress&logoColor=white)](https://wordpress.org)
[![PHP 8.0+](https://img.shields.io/badge/PHP-8.0%2B-777bb4?logo=php&logoColor=white)](https://php.net)
[![License: GPL v2](https://img.shields.io/badge/License-GPL_v2-blue.svg)](https://www.gnu.org/licenses/gpl-2.0.html)
[![Version](https://img.shields.io/badge/version-1.1.5-success)](readme.txt)

---

## Overview

Passwords are the single biggest security risk for your WordPress site. They get leaked, reused, or broken by automated brute-force attacks. Standard Two-Factor Authentication (2FA) adds safety, but typing in temporary codes from SMS or authenticator apps introduces annoying friction to your daily workflow.

**Advanced Passkeys for Secure Login** brings the future of un-phishable, modern authentication directly to your WordPress site using the official FIDO2 / WebAuthn standard.

Users register a passkey just once using their device's built-in biometric sensor (Face ID, Touch ID, Windows Hello) or a hardware security key (like a YubiKey). Future sign-ins take less than a second—completely bypassing the traditional password field.

### ⚡ Why Switch to Passkeys?
- **Immune to Phishing:** Passkeys are cryptographically bound to your specific domain. A lookalike phishing site cannot trick or steal a passkey.
- **Goodbye Brute-Force:** Because there is no static password on the server to guess, automated bot attacks are completely neutralized.
- **Ultimate Ecosystem Sync:** Works seamlessly with iCloud Keychain, Google Password Manager, and 1Password for painless cross-device access.
- **Ecosystem-Wide Integrations:** Intelligent, dependency-aware integration modules that automatically inject passkey entry points into your favorite membership, e-commerce, and LMS tools.

---

## Features

### 🔐 Core Authentication
- Passkey registration and authentication via the **WebAuthn Level 2** specification.
- Seamless compatibility with **Face ID, Touch ID, Windows Hello, Android biometrics, YubiKey**, and any FIDO2 authenticator.
- Drop-in passkey button on `wp-login.php` — no template edits or code snippets required.
- Optional **Conditional UI passkey autofill** on `wp-login.php` (browser-supported) for native username-field passkey suggestions.
- Passkey configuration right from the native **WordPress User Profile** (rename, revoke, capacity indicator).

### 🧩 Theme Overrides
- Native template override engine for plugin views using a Woo/EDD-style path hierarchy.
- Override-ready login button template at `templates/login/button.php`.
- Theme override path: `wp-content/themes/{your-active-theme}/advanced-passkeys/login/button.php`

### 🔌 Intelligent Ecosystem Integrations
Built-in aware modules, Gutenberg blocks, and shortcodes that auto-inject into popular platforms when active:
- **E-Commerce & Digital Goods:** WooCommerce, Easy Digital Downloads
- **Membership & Subscriptions:** MemberPress, Ultimate Member, Paid Memberships Pro (PMPro)
- **LMS & Community:** LearnDash, BuddyBoss
- **Forms:** Gravity Forms

### 📊 Dashboard & Monitoring
- **Authenticator Overview Card:** Get real-time insight into provider distribution, device types, and usage trends.
- **Last Login Activity Card:** Quick, at-a-glance sign-in visibility for immediate monitoring.
- **Users List Column:** Adds a native admin column showing each user's total registered passkey count.
- **Smart Admin Nudge:** A dismissible admin notice prompts eligible users to register their first passkey to protect their accounts.

### 🛡️ Hardened Security & Performance
- **Granular Role Control:** Grant passkey usage selectively (e.g., protect Administrators first, or open it to all users).
- **Brute-Force Protection:** Rate limiting on login and revoke endpoints with automated daily cron cleanup of expired rows.
- **Configurable Controls:** Adjust challenge TTL (30–600s), login fallback paths, RP custom names, and log retention.
- **Local-First & Lightweight:** Zero external API dependencies, clean database footprint, and complete multisite-aware activation.

---

## Requirements

| Requirement | Minimum |
|-------------|---------|
| PHP | 8.0 |
| WordPress | 6.0 |
| HTTPS | Required (WebAuthn mandates a secure context) |
| Browser | Any modern browser (Chrome 67+, Safari 14+, Firefox 60+, Edge 18+) |

---

## Installation

### From the WordPress admin

1. Upload the `advanced-passkey-login` folder to `/wp-content/plugins/`.
2. Activate via **Plugins → Installed Plugins**.
3. Go to **Settings → Advanced Passkeys for Secure Login** and enable passkeys.
4. Visit **Your Profile** and register your first passkey.
5. Sign out and click **Sign in with Passkey** on the login page.

## Template Overrides

Theme developers can override plugin templates by copying files into:

`/wp-content/themes/{child-or-parent-theme}/advanced-passkeys/`

Current starter template:

- `login/button.php`

Minimal override file header example:

```php
<?php
/**
 * Advanced Passkeys template override: login button.
 *
 * Place in:
 * /wp-content/themes/your-child-theme/advanced-passkeys/login/button.php
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Template args provided by plugin:
// $show_sep (bool), $conditional_enabled (bool), $style_classes (string)
```

## Conditional UI (Passkey Autofill)

When enabled in **Settings → Advanced → Enable passkey autofill (Conditional UI)**:

- Browsers that support Conditional UI can show passkeys in the native username autofill flow.
- The manual `Sign in with Passkey` button on `wp-login.php` is hidden.
- The login OR separator is automatically disabled to avoid duplicate prompts.
- Password fallback remains available.

## AAGUID Mapping Sync

Provider detection uses a local generated snapshot from:

- `https://github.com/passkeydeveloper/passkey-authenticator-aaguids`

To refresh AAGUID to provider mappings:

```bash
npm run sync:aaguid-map
```

This command regenerates:

- `includes/data/aaguid-provider-map.php`
- `includes/data/provider-icon-map.php`

The plugin reads this local file at runtime and does not fetch remote data during authentication.

## Build Test ZIP (No Deploy)

Use this to package the latest plugin code into an installable ZIP for testing on other WordPress installs without deploying to WordPress.org.

Local command:

```bash
npm run package:zip
```

Output:

- `dist/advanced-passkey-login-<version>-<timestamp>.zip`

GitHub Actions (manual):

- Run workflow: `Package Plugin ZIP`
- It uploads an artifact named `plugin-zip`
- This workflow does **not** deploy to WordPress.org

### From source (development)

```bash
git clone [https://github.com/mbuiux/advanced-passkey-login.git](https://github.com/mbuiux/advanced-passkey-login.git)
cd advanced-passkey-login
composer install

## Playwright E2E Testing

This repository includes a Playwright suite for the WordPress login and WebAuthn passkey flow.

### Install test dependencies

```bash
npm install
npx playwright install chromium
```

### Run tests

```bash
# Uses https://wp-test.local by default
npm run test:e2e

# Override target URL when needed
PLAYWRIGHT_BASE_URL=https://wp-test.local npm run test:e2e

# Show discovered tests without executing browser flows
npm run test:e2e:list
```

### Included suite

- `tests/e2e/advanced-passkey-login.spec.ts`

The suite covers:
- strict CSP compatibility on `wp-login.php`
- virtual authenticator registration + login via CDP WebAuthn
- anti-caching challenge isolation across independent browser contexts
- expired nonce/session-timeout handling with user-friendly error assertions