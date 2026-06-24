import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const ADMIN_USERNAME = process.env.PLAYWRIGHT_ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASS || 'admin';
const THEME_DIR = process.env.PLAYWRIGHT_ACTIVE_THEME_DIR || '';

const SELECTORS = {
  wpUserLogin: '#user_login',
  wpUserPass: '#user_pass',
  wpSubmit: '#wp-submit',
  passkeyBlock: '#advapafo-login-passkey-block',
  passkeyButton: '#advapafo-signin-passkey',
  passkeySeparator: '.advapafo-login-separator',
  advancedTab: '.advapafo-tabs .advapafo-tab:has-text("Advanced")',
  saveSettingsButton: '.advapafo-settings-form .advapafo-save-button',
  conditionalToggle: 'input[name="advapafo_conditional_ui_enabled"]',
  separatorToggle: 'input[name="advapafo_show_separator"]',
  separatorHiddenInput: 'input[type="hidden"][name="advapafo_show_separator"][value="0"]',
};

const SETTINGS_PAGE_PATH = '/wp-admin/options-general.php?page=advanced-passkey-login';

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/wp-login.php');
  await page.fill(SELECTORS.wpUserLogin, ADMIN_USERNAME);
  await page.fill(SELECTORS.wpUserPass, ADMIN_PASSWORD);
  await page.click(SELECTORS.wpSubmit);

  const adminUrlReached = page.waitForURL(/\/wp-admin\//, { timeout: 12_000 }).then(() => true).catch(() => false);
  const loginErrorVisible = page
    .locator('#login_error')
    .waitFor({ state: 'visible', timeout: 12_000 })
    .then(() => true)
    .catch(() => false);

  const [isAdminUrl, hasLoginError] = await Promise.all([adminUrlReached, loginErrorVisible]);

  if (!isAdminUrl && hasLoginError) {
    const loginErrorText = (await page.locator('#login_error').innerText()).trim();
    throw new Error(`WordPress login failed for user "${ADMIN_USERNAME}": ${loginErrorText}`);
  }

  if (!isAdminUrl) {
    throw new Error('WordPress login did not reach /wp-admin and no explicit #login_error was found.');
  }
}

async function openAdvancedSettingsTab(page: Page): Promise<void> {
  await page.goto(SETTINGS_PAGE_PATH);
  await page.locator(SELECTORS.advancedTab).first().click();
  await expect(page.locator(SELECTORS.conditionalToggle).first()).toBeVisible();
}

async function setConditionalUi(page: Page, enabled: boolean): Promise<void> {
  await openAdvancedSettingsTab(page);

  const toggle = page.locator(SELECTORS.conditionalToggle).first();
  if (enabled) {
    await toggle.check();
  } else {
    await toggle.uncheck();
  }

  await page.locator(SELECTORS.saveSettingsButton).first().click();
  await page.waitForURL(/options-general\.php\?page=advanced-passkey-login/);
}

test.describe('advanced-passkey-login template + conditional ui', () => {
  test('conditional UI lock behavior and wp-login rendering are enforced', async ({ page }) => {
    await loginAsAdmin(page);

    await setConditionalUi(page, true);

    await openAdvancedSettingsTab(page);

    const separatorToggle = page.locator(SELECTORS.separatorToggle).first();
    await expect(separatorToggle, 'OR separator toggle should be locked when Conditional UI is enabled.').toBeDisabled();
    await expect(page.locator(SELECTORS.separatorHiddenInput), 'Hidden fallback field should force separator OFF while locked.').toHaveCount(1);

    await page.goto('/wp-login.php');

    const passkeyBlock = page.locator(SELECTORS.passkeyBlock).first();
    await expect(passkeyBlock).toBeVisible();

    const passkeyButton = page.locator(SELECTORS.passkeyButton).first();
    await expect(passkeyButton, 'Manual passkey button should be hidden when Conditional UI is enabled.').toBeHidden();
    await expect(page.locator(SELECTORS.passkeySeparator), 'OR separator should be absent when Conditional UI is enabled.').toHaveCount(0);

    const paddingTop = await passkeyBlock.evaluate((node) => window.getComputedStyle(node).paddingTop);
    expect(paddingTop, 'Conditional-only passkey block should not add bottom-form whitespace via top padding.').toBe('0px');

    // Cleanup to reduce side effects for other tests.
    await loginAsAdmin(page);
    await setConditionalUi(page, false);
  });

  test('theme override template is loaded when login/button.php exists in theme override path', async ({ page }) => {
    test.skip(!THEME_DIR, 'Set PLAYWRIGHT_ACTIVE_THEME_DIR to run real theme override assertion.');

    const relativeOverridePath = path.join('advanced-passkeys', 'login', 'button.php');
    const overrideFilePath = path.join(THEME_DIR, relativeOverridePath);
    const markerClass = 'advapafo-e2e-template-override-marker';

    const overrideTemplate = [
      '<?php',
      'if ( ! defined( "ABSPATH" ) ) { exit; }',
      '$show_sep = isset( $show_sep ) ? (bool) $show_sep : false;',
      '$conditional_enabled = isset( $conditional_enabled ) ? (bool) $conditional_enabled : false;',
      '$style_classes = isset( $style_classes ) ? (string) $style_classes : "advapafo-passkey-btn--black";',
      '?>',
      '<div id="advapafo-login-passkey-block" class="<?php echo esc_attr( $conditional_enabled ? "advapafo-login-passkey-block--conditional-only" : "" ); ?>">',
      '  <div class="<?php echo esc_attr( "advapafo-login-passkey-wrap" . ( $show_sep ? "" : " advapafo-no-separator" ) . ( $conditional_enabled ? " advapafo-login-passkey-wrap--conditional-only" : "" ) ); ?>">',
      '    <button type="button" id="advapafo-signin-passkey" class="button button-large advapafo-passkey-btn <?php echo esc_attr( $style_classes ); ?> ' + markerClass + '">',
      '      <?php esc_html_e( "Sign in with Passkey", "advanced-passkey-login" ); ?>',
      '    </button>',
      '    <p id="advapafo-passkey-login-message" class="advapafo-login-message advapafo-is-hidden" aria-live="polite"></p>',
      '  </div>',
      '</div>',
      '',
    ].join('\n');

    await fs.mkdir(path.dirname(overrideFilePath), { recursive: true });
    await fs.writeFile(overrideFilePath, overrideTemplate, 'utf8');

    try {
      await page.goto('/wp-login.php');
      const overrideMarker = page.locator(`.${markerClass}`).first();
      await expect(overrideMarker, 'Theme override template marker class was not rendered.').toBeVisible();
    } finally {
      await fs.rm(overrideFilePath, { force: true });
    }
  });
});
