=== Advanced Passkeys for Secure Login ===
Contributors: wppasskey, mbuiux
Tags: passkeys, webauthn, passwordless, login, security
Requires at least: 6.0
Tested up to: 7.0
Stable tag: 1.1.10
Requires PHP: 8.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Secure WordPress with passwordless passkey login using Face ID, Touch ID, Windows Hello, and hardware security keys.

== Description ==

Passwords are the single biggest security risk for your WordPress site. They get leaked, reused, or broken by automated brute-force attacks. Standard Two-Factor Authentication (2FA) adds safety, but typing in temporary codes from SMS or authenticator apps introduces annoying friction to your daily workflow.

**Advanced Passkeys for Secure Login** brings the future of un-phishable, modern authentication directly to your WordPress site using the official FIDO2 / WebAuthn standard. 

Users register a passkey just once using their device's built-in biometric sensor (Face ID, Touch ID, Windows Hello) or a hardware security key (like a YubiKey). Future sign-ins take less than a second—completely bypassing the traditional password field.

=== Why Switch to Passkeys? ===
* **Immune to Phishing:** Passkeys are cryptographically bound to your specific domain. A fake login page cannot trick or steal a passkey.
* **Goodbye Brute-Force:** Because there is no static password on the server to guess, automated bot attacks are completely neutralized.
* **Ultimate Ecosystem Sync:** Works seamlessly with iCloud Keychain, Google Password Manager, and 1Password for painless cross-device access.

=== Ecosystem-Wide Integrations Included ===
Unlike basic alternatives, this plugin features intelligent, dependency-aware integration modules that automatically inject passkey entry points into your favorite plugins. It features out-of-the-box support for **WooCommerce, Easy Digital Downloads, MemberPress, Ultimate Member, LearnDash, BuddyBoss, Gravity Forms, and PMPro**.

== Features ==

* **One-Click Passwordless Auth:** Adds a native "Sign in with Passkey" button directly to the WordPress login screen.
* **Conditional UI Autofill:** Optional browser-native passkey autofill prompts on `wp-login.php` when username is focused.
* **Ecosystem Integrations:** Built-in aware modules, blocks, and shortcodes for WooCommerce, MemberPress, LearnDash, BuddyBoss, and more.
* **Gutenberg Blocks & Shortcodes:** Automatically registers custom login cards and shortcodes based on active plugins.
* **Theme Template Overrides:** Override the login button template via `/advanced-passkeys/login/button.php` in your active theme.
* **Admin Dashboard Overview:** Keep track of credential performance with an Authenticator Overview card and Last Login activity logs.
* **Granular Role Controls:** Easily configure exactly which user roles are permitted to use passkey authentication (Default: Administrators).
* **Brute-Force Rate Limiting:** Hardened local security with built-in login rate-limiting and automated daily log cleanups.
* **Multisite Compatible:** Network-aware provisioning instantly configures security settings for newly created network sites.
* **Clean Performance & Housekeeping:** Lightweight footprint with a clean uninstall routine that leaves zero orphaned tables or options behind.

== Installation ==

= Automatic installation =

1. In your WordPress admin, go to **Plugins > Add New**
2. Search for **Advanced Passkeys for Secure Login**
3. Click **Install Now** then **Activate**
4. Go to **Settings > Advanced Passkeys for Secure Login** and enable passkeys

= Manual installation =

1. Download the plugin ZIP from WordPress.org
2. Go to **Plugins > Add New > Upload Plugin** and upload the ZIP
3. Click **Activate**
4. Go to **Settings > Advanced Passkeys for Secure Login** and enable passkeys

= After activation =

1. Go to **Settings > Advanced Passkeys for Secure Login** — verify passkeys are enabled and select which roles may use them.
2. Visit **Users > Your Profile** and register your first passkey.
3. Sign out and confirm the **Sign in with Passkey** button appears on the login page.
4. Register a backup passkey on a second device to avoid lockout.

= Production & Local Environments =

Passkeys require a secure (HTTPS) connection context. The plugin will actively block passkey flows over plain HTTP in production. 
If you are testing locally without an SSL certificate, you can bypass this restriction by adding the following line to your `wp-config.php` file:

`define( 'ADVAPAFO_ALLOW_HTTP', true );` (*Never use this in production!*)

== Frequently Asked Questions ==

= Does this replace passwords entirely? =

No. Passkeys act as a seamless, high-security alternative sign-in method. Users retain their standard WordPress passwords as a reliable fallback.

= Which browsers and devices are supported? =

Any browser supporting the WebAuthn standard (all major platforms since 2022) including Chrome, Safari, Firefox, and Edge. Supported hardware includes iPhones, iPads, Macs, Android devices, Windows Hello machines, and physical FIDO2/U2F security keys like YubiKeys.

= Is HTTPS required? =

Yes, in production environments. The official WebAuthn specification mandates a secure context. See the local development instructions in the Installation tab to test locally via HTTP.

= What PHP extensions do I need? =

The plugin relies on `openssl`, `mbstring`, and `json`. These core extensions are compiled by default on almost every modern managed WordPress host.

= Can I control which user roles can use passkeys? =

Yes. Navigate to **Settings > Advanced Passkeys for Secure Login > Eligible Roles**. While it defaults strictly to Administrators, you can provision passkeys for any core or custom role on your site.

= Which shortcodes are available? =

**Core shortcodes:**
* `[advapafo_login_button]`
* `[advapafo_register_button]`
* `[advapafo_passkey_profile]`
* `[advapafo_passkey_prompt]`

**Integration-specific shortcodes:** (active when corresponding plugins are running)
* `[advapafo_woocommerce_login]`
* `[advapafo_edd_login]`
* `[advapafo_memberpress_login]`
* `[advapafo_ultimate_member_login]`
* `[advapafo_learndash_login]`
* `[advapafo_buddyboss_login]`
* `[advapafo_gravityforms_login]`
* `[advapafo_pmp_login]`

= Which integration Gutenberg blocks are available? =

When an integration dependency is active, the plugin registers matching blocks:
* `advanced-passkey-login/woocommerce-login-card`
* `advanced-passkey-login/edd-login-card`
* `advanced-passkey-login/memberpress-login-card`
* `advanced-passkey-login/ultimate-member-login-card`
* `advanced-passkey-login/learndash-login-card`
* `advanced-passkey-login/buddyboss-login-card`
* `advanced-passkey-login/gravityforms-login-card`
* `advanced-passkey-login/pmp-login-card`

= What happens if I deactivate or delete the plugin? =

Deactivating keeps your data safe. Deleting (uninstalling) triggers a strict housekeeping routine that cleanly drops the `wp_wpk_credentials`, `wp_wpk_rate_limits`, and `wp_wpk_logs` tables alongside all `advapafo_*` options.

= Is the plugin multisite compatible? =

Yes. Database tables partition dynamically per site via `$wpdb->prefix`. Network activation auto-provisions existing sites and seamlessly configures any newly deployed network sites.

= Can I use a custom RP ID for subdomain setups? =

Yes. Simply add `define( 'ADVAPAFO_RP_ID', 'example.com' );` directly into your site's `wp-config.php` file.

= Can I override the login button template in my theme? =

Yes. Copy the plugin template file to your active theme override directory:

`/wp-content/themes/your-child-theme/advanced-passkeys/login/button.php`

or in a parent theme:

`/wp-content/themes/your-parent-theme/advanced-passkeys/login/button.php`

Minimal override header example:

`<?php`
`/**`
` * Advanced Passkeys template override: login button.`
` * /wp-content/themes/your-child-theme/advanced-passkeys/login/button.php`
` */`
`if ( ! defined( 'ABSPATH' ) ) { exit; }`

= What happens when Conditional UI is enabled? =

When enabled in Settings > Advanced:

* Browser-supported passkey autofill can appear on the username field.
* The manual "Sign in with Passkey" button is hidden on `wp-login.php`.
* The login OR separator is automatically disabled.
* Password fallback remains available.

== Developer Hooks: Last Used Pill ==

Developers can use these filters inside a theme or functionality plugin to globally customize or suppress the login form's Last used passkey indicator pill.

= Available filters =

* `advapafo_last_used_pill_freshness_days` — default 90 days
* `advapafo_last_used_pill_visible` — final on/off override
* `advapafo_last_used_pill_label` — customize label text


= Example implementation =

    <?php
    /**
     * Example customization for Last used login pill.
     */

    // Show pill if passkey login is within 120 days.
    add_filter( 'advapafo_last_used_pill_freshness_days', function ( $days, $user ) {
        unset( $user );
        return 120;
    }, 10, 2 );

    // Hide pill for administrator accounts.
    add_filter( 'advapafo_last_used_pill_visible', function ( $visible, $timestamp, $freshness_days, $user ) {
        unset( $timestamp, $freshness_days );

        if ( $user instanceof WP_User && in_array( 'administrator', (array) $user->roles, true ) ) {
            return false;
        }

        return $visible;
    }, 10, 4 );

    // Label override.
    add_filter( 'advapafo_last_used_pill_label', function ( $label, $user ) {
        unset( $user );
        return 'Previously used';
    }, 10, 2 );

== Screenshots ==

1. Dashboard tab with security activity metrics, authenticator overview, and last-login insights.
2. Settings tab with everyday passkey controls, integration module toggles, and eligible role selection.
3. Advanced tab showing technical configuration for login UX, RP settings, challenge timeouts, and rate limiting.
4. Shortcodes tab with copy-ready shortcode cards, quick-start guidance, and integration snippets.
5. User Profile passkey management panel for registering a new passkey and revoking existing credentials.
6. Core WordPress login form with the "Sign in with Passkey" button below the standard password flow in the default black.
7. Core WordPress login form with Last used passkey indicator pill for returning users in light gray.

== Changelog ==

= 1.1.10 =
* Fixed: conditional UI login elements now remain hidden consistently when conditional UI is enabled.
* Improved: authenticator provider reporting resolves legacy credential/log payload variants more reliably.
* Improved: registration errors now show friendlier passkey guidance for browser invalid-state failures.

= 1.1.9 =
* Improved: admin footer link styling and rating stars visibility for the settings screen.

= 1.1.8 =
* Fixed: passkey revoke reliability across compatibility credential tables.
* Improved: authenticator provider normalization and typo tolerance for brand labeling.
* Improved: reporting metadata normalization for authenticator detection.

= 1.1.7 =
* Improved: aligned plugin header author metadata with readme contributors.

= 1.1.6 =
* Improved: include WordPress.org assets directory in release source so banners, icon, and screenshots deploy via SVN automation.

= 1.1.5 =
* Improved: sanitize-early handling for transports and credential request inputs.
* Improved: stricter nonce-gated debug query handling in settings.
* Improved: output escaping hardening for integration-rendered markup and dynamic admin classes.
* Improved: release and quality workflow validation guardrails (actionlint gate).

= 1.1.4 =
* Added: Dashboard tab with an Authenticator Overview card.
* Added: Last Login activity card in the Dashboard tab.
* Improved: nonce and capability enforcement across sensitive request handlers.
* Improved: release packaging workflow with strict file allowlist validation.
* Fixed: release automation now publishes real GitHub releases with attached installable ZIP.

= 1.1.2 =
* Added: integration manager for popular ecosystem plugins with dependency-aware module loading.
* Added: integration-specific shortcodes and Gutenberg blocks.
* Added: integration controls in settings with installed/not installed indicators.
* Added: shortcode quick-start helper and improved shortcode documentation in admin UI.
* Changed: removed legacy shortcode alias registrations and related legacy copy.
* Changed: refreshed docs and translation template strings for current shortcode names.

= 1.1.1 =
* Updated: plugin name and user-facing references to "Advanced Passkeys for Secure Login".
* Updated: settings/UI copy to use the full plugin name.

= 1.1.0 =
* Added: dismissible "set up your passkey" nudge notice for eligible users.
* Added: Passkeys column in the admin Users list showing count per user.
* Added: Scheduled daily cleanup of expired rate-limit rows and old log entries.
* Added: Challenge timeout setting in Settings > Advanced Passkeys for Secure Login > Advanced.
* Added: Login redirect URL field in settings (fallback after passkey login).
* Added: `[advapafo_login_button]` and `[advapafo_register_button]` shortcodes.
* Added: Log retention period setting (days).
* Improved: `get_challenge_ttl()` now reads from the settings UI.

= 1.0.0 =
* Initial release.

== Upgrade Notice ==

= 1.1.10 =
Recommended update: improves conditional UI consistency, legacy authenticator mapping reliability, and registration error clarity.

= 1.1.9 =
Recommended update: refines admin footer link/rating styles for better settings-page visibility.

= 1.1.8 =
Recommended update: fixes passkey revocation edge cases and improves authenticator brand detection/reporting reliability.

= 1.1.7 =
Recommended update: aligns plugin author metadata for WordPress.org listing consistency.

= 1.1.6 =
Recommended update: ensures WordPress.org visual assets are included in automated deploys.

= 1.1.5 =
Recommended update: strengthens sanitize/validate/escape protections and improves CI workflow safety checks.

= 1.1.4 =
Recommended update: adds dashboard visibility, hardens request validation, and improves release packaging quality gates.

= 1.1.2 =
Recommended update: adds integration module controls, Gutenberg block support, and shortcode UX improvements.