import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const ADMIN_USERNAME = process.env.PLAYWRIGHT_ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASS || 'admin';

const SELECTORS = {
  wpUserLogin: '#user_login',
  wpUserPass: '#user_pass',
  wpSubmit: '#wp-submit',
  advancedTab: '.advapafo-tabs .advapafo-tab:has-text("Advanced")',
  conditionalToggle: 'input[name="advapafo_conditional_ui_enabled"]',
  saveSettingsButton: '.advapafo-settings-form .advapafo-save-button',
  passkeyLoginButton: ['#advapafo-signin-passkey', '#passkey-login-btn'],
  passkeyRegisterButton: ['#advapafo-passkey-register', '#register-passkey-btn'],
  loginErrorNotice: ['#advapafo-login-notice', '#advapafo-passkey-login-message', '.passkey-error-notice'],
};

const STRICT_CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self';";

function annotateRisk(description: string): void {
  test.info().annotations.push({ type: 'risk', description });
}

function isAjaxActionRequest(request: { url(): string; method(): string; postData(): string | null }, action: string): boolean {
  const postBody = request.postData() ?? '';
  const hasUrlEncodedAction = postBody.includes(`action=${action}`);
  const hasFormDataAction = postBody.includes('name="action"') && postBody.includes(action);

  return (
    request.method() === 'POST' &&
    request.url().includes('/wp-admin/admin-ajax.php') &&
    (hasUrlEncodedAction || hasFormDataAction)
  );
}

async function firstVisibleLocator(page: Page, selectors: string[]) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count()) {
      return locator;
    }
  }

  return page.locator(selectors[0]).first();
}

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/wp-login.php');
  await page.fill(SELECTORS.wpUserLogin, ADMIN_USERNAME);
  await page.fill(SELECTORS.wpUserPass, ADMIN_PASSWORD);
  const submit = page.locator(SELECTORS.wpSubmit);
  await submit.waitFor({ state: 'visible' });
  await submit.click({ force: true });
  await page.waitForURL(/\/wp-admin\/?(?:index\.php)?(?:\?.*)?$/);
}

async function logoutFromWordPress(page: Page): Promise<void> {
  await page.goto('/wp-login.php?action=logout');

  const confirmLogout = page.getByRole('link', { name: /log out/i });
  if (await confirmLogout.count()) {
    await confirmLogout.first().click();
  }

  await page.waitForURL(/\/wp-login\.php(?:\?.*)?$/);
}

async function ensureConditionalUiDisabled(page: Page): Promise<void> {
  await page.goto('/wp-admin/options-general.php?page=advanced-passkey-login');
  const advancedTab = page.locator(SELECTORS.advancedTab).first();
  const advancedHref = await advancedTab.getAttribute('href');
  if (advancedHref) {
    await page.goto(advancedHref);
  } else {
    await advancedTab.click({ force: true });
  }

  const toggle = page.locator(SELECTORS.conditionalToggle).first();
  if (await toggle.isChecked()) {
    await toggle.evaluate((node) => {
      const input = node as HTMLInputElement;
      input.checked = false;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.locator(SELECTORS.saveSettingsButton).first().click({ force: true });
    await page.waitForURL(/options-general\.php\?page=advanced-passkey-login/);
  }
}

function extractChallenge(payload: unknown): string {
  const data = payload as
    | {
        data?: {
          options?: {
            challenge?: string;
            publicKey?: {
              challenge?: string;
            };
          };
        };
      }
    | undefined;

  return data?.data?.options?.publicKey?.challenge ?? data?.data?.options?.challenge ?? '';
}

async function triggerBeginLoginAndGetChallenge(page: Page): Promise<string> {
  const beginLoginResponse = page.waitForResponse((response) =>
    isAjaxActionRequest(response.request(), 'advapafo_begin_login'),
  );

  const passkeyLoginButton = await firstVisibleLocator(page, SELECTORS.passkeyLoginButton);
  await passkeyLoginButton.click();

  const response = await beginLoginResponse;
  const payload = (await response.json()) as unknown;
  return extractChallenge(payload);
}

test.describe('advanced-passkey-login wp-login flow', () => {
  test('CSP compliance: strict CSP does not break passkey script flow with inline execution violations', async ({ page }) => {
    annotateRisk('CSP hardening: plugin scripts must not require unsafe inline execution on wp-login.php');

    const cspViolations: string[] = [];

    // Intercept login page response and enforce a restrictive CSP to emulate hardened hosts.
    await page.route('**/wp-login.php*', async (route) => {
      const upstreamResponse = await route.fetch();
      const headers = {
        ...upstreamResponse.headers(),
        'content-security-policy': STRICT_CSP,
      };

      await route.fulfill({
        response: upstreamResponse,
        headers,
      });
    });

    page.on('pageerror', (error) => {
      const message = String(error?.message ?? '');
      if (/content security policy|csp|violat/i.test(message)) {
        cspViolations.push(message);
      }
    });

    page.on('console', (msg) => {
      const text = msg.text();
      if (/content security policy|csp|violat/i.test(text)) {
        cspViolations.push(text);
      }
    });

    await page.goto('/wp-login.php');

    const passkeyLoginButton = await firstVisibleLocator(page, SELECTORS.passkeyLoginButton);
    await expect(passkeyLoginButton, 'Passkey login trigger is missing on wp-login.php.').toBeVisible();

    await passkeyLoginButton.click();

    await page.waitForTimeout(750);

    // WordPress core may emit inline-script CSP noise; only fail if plugin-owned assets/messages violate CSP.
    const pluginScopedCspViolations = cspViolations.filter((msg) =>
      /advapafo|advanced-passkey-login|\/wp-content\/plugins\/advanced-passkey-login/i.test(msg),
    );
    expect(
      pluginScopedCspViolations,
      'Plugin-owned assets emitted CSP violations under strict policy.',
    ).toEqual([]);
  });

  test('virtual authenticator: register passkey then login successfully', async ({ page, browserName }) => {
    annotateRisk('Auth flow regression: passkey register + subsequent passkey sign-in must complete end-to-end');

    test.skip(browserName !== 'chromium', 'Virtual WebAuthn authenticator requires Chromium CDP support.');

    await loginAsAdmin(page);
    await ensureConditionalUiDisabled(page);

    // CDP is used so CI can simulate platform authenticators without physical biometric hardware.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('WebAuthn.enable');

    const { authenticatorId } = (await cdp.send('WebAuthn.addVirtualAuthenticator', {
      options: {
        protocol: 'ctap2',
        transport: 'internal',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    })) as { authenticatorId: string };

    await page.goto('/wp-admin/profile.php');

    const registerButton = await firstVisibleLocator(page, SELECTORS.passkeyRegisterButton);
    await expect(registerButton, 'Register passkey button is missing on profile page.').toBeVisible();

    const finishRegistration = page.waitForResponse((response) =>
      isAjaxActionRequest(response.request(), 'advapafo_finish_registration'),
    );

    await registerButton.click();

    const finishRegistrationResponse = await finishRegistration;
    expect(finishRegistrationResponse.ok(), 'finish_registration returned a non-2xx response.').toBeTruthy();
    const finishRegistrationPayload = (await finishRegistrationResponse.json()) as { success?: boolean };
    expect(finishRegistrationPayload.success, 'finish_registration payload did not report success.').toBeTruthy();

    await logoutFromWordPress(page);

    await page.goto('/wp-login.php');

    const passkeyLoginButton = await firstVisibleLocator(page, SELECTORS.passkeyLoginButton);
    await expect(passkeyLoginButton, 'Passkey sign-in button is missing after logout.').toBeVisible();
    await passkeyLoginButton.click();

    await page.waitForURL(/\/wp-admin\//, { timeout: 20_000 });
    await cdp.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId });
  });

  test('aggressive caching guard: login challenge is unique across isolated contexts', async ({ browser }) => {
    annotateRisk('Challenge replay/caching: each isolated context must receive a unique WebAuthn challenge');

    const contextOne = await browser.newContext();
    const contextTwo = await browser.newContext();

    try {
      const pageOne = await contextOne.newPage();
      await pageOne.goto('/wp-login.php');
      const challengeUser1 = await triggerBeginLoginAndGetChallenge(pageOne);

      const pageTwo = await contextTwo.newPage();
      await pageTwo.goto('/wp-login.php');
      const challengeUser2 = await triggerBeginLoginAndGetChallenge(pageTwo);

      expect(challengeUser1, 'User 1 challenge is empty; begin_login payload may be malformed.').not.toEqual('');
      expect(challengeUser2, 'User 2 challenge is empty; begin_login payload may be malformed.').not.toEqual('');
      expect(challengeUser1, 'Challenge reuse detected across isolated contexts (possible caching bug).').not.toEqual(challengeUser2);
    } finally {
      await contextOne.close();
      await contextTwo.close();
    }
  });

  test('expired nonce/session timeout: shows user-friendly error and recovers from busy state', async ({ page }) => {
    annotateRisk('Session timeout UX: invalid nonce must fail gracefully without stuck loading state');

    await loginAsAdmin(page);
    await ensureConditionalUiDisabled(page);
    await logoutFromWordPress(page);

    await page.goto('/wp-login.php');

    const passkeyLoginButton = await firstVisibleLocator(page, SELECTORS.passkeyLoginButton);
    await expect(passkeyLoginButton, 'Passkey sign-in button is missing on wp-login.php.').toBeVisible();

    await page.evaluate(() => {
      const win = window as typeof window & {
        ADVAPAFOLogin?: {
          nonce?: string;
        };
      };

      if (win.ADVAPAFOLogin) {
        win.ADVAPAFOLogin.nonce = '';
      }

      for (const name of ['nonce', '_ajax_nonce', '_wpnonce']) {
        const field = document.querySelector<HTMLInputElement>(`input[name="${name}"]`);
        if (field) {
          field.value = '';
        }
      }
    });

    const beginLoginResponse = page.waitForResponse((response) =>
      isAjaxActionRequest(response.request(), 'advapafo_begin_login'),
    );

    await passkeyLoginButton.click();
    await beginLoginResponse;

    await expect
      .poll(async () => {
        const disabled = await passkeyLoginButton.isDisabled();
        const busyClass = await passkeyLoginButton.evaluate((node) => node.classList.contains('advapafo-btn-busy'));
        return disabled || busyClass;
      }, { message: 'Passkey button remained busy/disabled after nonce rejection.' })
      .toBeFalsy();

    const errorNotice = await firstVisibleLocator(page, SELECTORS.loginErrorNotice);
    await expect(errorNotice, 'Expected a user-facing error notice after nonce failure.').toBeVisible();
    await expect(errorNotice, 'Error notice does not contain expected recovery wording.').toContainText(/invalid|failed|error|expired|try again|resident credentials|allowcredentials/i);
  });
});
