# AI Coding Instructions

Scope: This file governs all AI-generated changes in this plugin.

## Plugin Context
- Plugin slug: `advanced-passkey-login`
- Main bootstrap file: `advanced-passkey-login.php`

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

## SQL Hardening Rules (Required)
1. Always use `$wpdb` methods and `$wpdb->prepare()` for any query with dynamic values.
2. Never concatenate untrusted variables directly into SQL text (including `WHERE`, `IN`, `ORDER BY`, `LIMIT`, and `OFFSET` fragments).
3. Every dynamic value must map to an explicit placeholder in the query (`%s`, `%d`, `%f`) and be passed through the `prepare()` arguments.
4. Do not pass pre-built variable SQL fragments like `$where_sql` directly into a parent query string unless they are built exclusively from fixed literals and placeholder templates and then prepared before interpolation.
5. If a dynamic list is needed (such as `IN (...)`), generate placeholder tokens programmatically and pass all values as prepare arguments.
6. Prefer explicit allowlist branches for dynamic table/column selection rather than assembling SQL fragments from variables.
7. Table names cannot be parameterized by `prepare()`. If dynamic table names are unavoidable, only allow strict internal allowlists or strict regex validation of plugin-owned table names before interpolation.

## Nonce Implementation Rules
1. Generate nonce with `wp_create_nonce( 'specific_action_name' )`.
2. Verify with `check_admin_referer()` / `check_ajax_referer()` where appropriate.
3. If custom verification is required, use `wp_verify_nonce()` with strict action matching.
4. On failed nonce check, stop processing immediately (`wp_die`, `wp_send_json_error`, or safe redirect + exit).
5. Nonce verification must happen inside the handling function, not at plugin load time.
6. Never gate nonce checks behind optional branches that can be skipped.

## Regression Guardrails
1. Do not create users or establish logged-in sessions as a fallback inside authentication handlers.
2. Do not call `wp_set_current_user()` or `wp_set_auth_cookie()` directly to bypass normal authentication verification.
3. Authentication/login handlers must only log in already-validated users through WordPress-authenticated flows and must fail closed on exceptions.
4. If nonce verification fails in AJAX/REST handlers, always return an explicit error response (`wp_send_json_error`, `wp_die`, or safe redirect+exit), never `wp_send_json_success`.
5. For JSON endpoints, nonce failure responses should use an error payload and appropriate HTTP status (typically `403`).
6. Treat output escaping as a non-regression requirement: do not introduce direct unescaped `echo` of variables, options, or generated markup.

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
4. Escape all echoed variables/options/generated data at the final output point ("escape late"), even when data was sanitized before storage.
5. For helper methods that return markup, still escape at echo-time with an allowlist context (`wp_kses()`/`wp_kses_post()`) unless equivalent escaping is guaranteed in that exact output context.
6. For API/JSON handlers, return structured responses (`wp_send_json_success`, `wp_send_json_error`, REST responses) instead of raw `echo` output.
7. For dynamic HTML attribute output (for example style/disabled/data attributes), output safe values in context (`esc_attr`) or use conditional literal attributes instead of echoing prebuilt raw attribute strings.

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

## Release Packaging Guardrails
1. The WordPress.org deploy workflow (`.github/workflows/deploy.yml`) packages from repository content using `.distignore`.
2. Any E2E or local QA harness files must be excluded from release artifacts via `.distignore`.
3. Keep these entries in `.distignore` whenever Playwright is present:
   - `tests/`
   - `playwright.config.ts`
   - `playwright-report/`
   - `test-results/`
   - `package.json`
   - `package-lock.json`
4. Before release tags, verify a dist simulation (or equivalent package check) confirms those paths are absent from the final deploy payload.

## Release Tag Rules
1. The deploy workflow trigger accepts any Git tag, but agents must only create release tags in strict semantic format: `X.Y.Z`.
2. Do not use a leading `v` in release tags (use `1.2.3`, not `v1.2.3`).
3. Release tag value must exactly match the plugin version in `advanced-passkey-login.php` and the Stable tag in `readme.txt`.
4. Do not create pre-release WordPress.org deploy tags (for example `-beta`, `-rc`, or build metadata suffixes).

## Plugin Path and URL Resolution Rules
1. Never hardcode this plugin slug in path/URL resolution (for example, avoid `plugins_url( 'advanced-passkey-login' )`).
2. In the main plugin file, define canonical constants using `__FILE__`:
   - `ADVAPAFO_PLUGIN_FILE` as `__FILE__`
   - `ADVAPAFO_PLUGIN_DIR` as `plugin_dir_path( __FILE__ )`
   - `ADVAPAFO_PLUGIN_URL` as `plugin_dir_url( __FILE__ )`
3. In other files, prefer these constants or `plugins_url( 'relative/path', ADVAPAFO_PLUGIN_FILE )`.
4. For writable files, use `wp_upload_dir()` and plugin-owned subdirectories under uploads; do not write to plugin directories.

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
6. SQL does not interpolate raw variable fragments like `$where_sql` or `$order_sql` directly into query text unless pre-prepared from fixed literals.
7. Dynamic table/column choices are implemented via allowlist branches where possible.
8. No request-handling logic runs on every load unless required by hook design.
9. Error responses do not leak sensitive internals.
10. Changes preserve performance characteristics for high-traffic sites.
11. Plugin Check must pass with a fully green result: zero warnings and zero errors.
12. PHPCS + WPCS must pass with fully green results: zero warnings and zero errors.
13. Validation commands were executed against the installed plugin path (the WordPress runtime copy), not the source repo path.
