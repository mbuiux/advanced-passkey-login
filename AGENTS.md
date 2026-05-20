# AI Coding Instructions (Lite Plugin)

Scope: This file governs all AI-generated changes in this plugin.

## Core Goal
Build and maintain this plugin to WordPress.org plugin standards with secure, performant, and maintainable code.

## Security Requirements (Non-Negotiable)
1. Never trust input from `$_POST`, `$_GET`, `$_REQUEST`, `$_FILES`, cookies, or headers.
2. Apply this mantra everywhere: Sanitize early, Always validate, Escape late.
3. Require nonce and capability checks for every state-changing action (AJAX, form handlers, admin actions, REST mutations).
4. Verify nonce first, fail closed, and return immediately on failure.
5. Do not write compound conditional logic that can accidentally bypass nonce checks.
6. Use explicit early-return guards. Preferred pattern:
   - Check request method/route intent.
   - Verify nonce with a dedicated expected action.
   - Check `current_user_can()` for minimum required capability.
   - Validate and sanitize all inputs.
   - Execute action.
7. Do not use loosely combined checks such as `if ( ! $nonce_ok && ! current_user_can(...) )`.
8. Do not rely on client-side checks for security.
9. Use prepared SQL for all database reads/writes involving dynamic values.
10. Do not expose secrets, license material, or internal tokens in HTML, JS, logs, or error messages.

## Nonce Implementation Rules
1. Generate nonce with `wp_create_nonce( 'specific_action_name' )`.
2. Verify with `check_admin_referer()` / `check_ajax_referer()` where appropriate.
3. If custom verification is required, use `wp_verify_nonce()` with strict action matching.
4. On failed nonce check, stop processing immediately (`wp_die`, `wp_send_json_error`, or safe redirect + exit).
5. Nonce verification must happen inside the handling function, not at plugin load time.
6. Never gate nonce checks behind optional branches that can be skipped.

## Input Handling Rules
1. Sanitize as soon as data enters the system.
2. Validate against allowed type/range/enum, not just format.
3. Reject invalid data with explicit error responses.
4. When using PHP filter APIs (`filter_var`, `filter_input`, `filter_var_array`, `filter_input_array`), always provide an explicit sanitizing/validating filter. Never rely on `FILTER_DEFAULT`.

## Output Rules
1. Escape all output at render time with context-appropriate functions:
   - `esc_html()`, `esc_attr()`, `esc_url()`, `esc_textarea()`, `wp_kses_post()`.
2. Do not pre-escape data on save as a substitute for output escaping.
3. Keep translation wrappers and escaping compatible (`esc_html__`, `esc_attr__`, etc.).

## Performance Rules
1. Do not run submission checks at plugin bootstrap or global scope.
2. Only perform request handling in explicitly invoked callbacks/hooks/functions.
3. Avoid expensive queries on every page load.
4. Cache or memoize repeated expensive operations where safe.
5. Keep admin-only logic in admin context.

## WordPress.org Compliance Rules
1. Follow WordPress coding standards and security best practices.
2. Keep behavior transparent; do not hide remote execution paths.
3. Use proper capability checks for privileged actions.
4. Keep licensing/upsell messaging compliant and non-deceptive.
5. Ensure uninstall and data handling are predictable and documented.

## Validation Target Rules
1. Run Plugin Check and PHPCS/WPCS against the installed plugin path in `wp-content/plugins`, not the source directory in `custom-plugins`.
2. Source repositories under `custom-plugins` may contain development and packaging files; only the installed plugin copy must be production-clean.
3. If deployed via symlink, the symlink target used by WordPress is the validation target.

## AI Change Checklist (Run Before Finalizing)
1. State-changing path includes strict nonce verification and capability check.
2. No bypassable mixed boolean logic in auth/nonce conditions.
3. All inputs are sanitized and validated.
4. All outputs are escaped in context.
5. SQL uses `$wpdb->prepare()` when dynamic values are present.
6. No request-handling logic runs on every load unless required by hook design.
7. Error responses do not leak sensitive internals.
8. Changes preserve performance characteristics for high-traffic sites.
9. Plugin Check must pass with a fully green result: zero warnings and zero errors.
10. PHPCS + WPCS must pass with fully green results: zero warnings and zero errors.
11. Validation commands were executed against the installed plugin path (the WordPress runtime copy), not the source repo path.
