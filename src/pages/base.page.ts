import { expect, Locator, Page } from '@playwright/test';

/**
 * Behaviour shared by every OrangeHRM page object.
 *
 * OrangeHRM 5.x builds its forms from a repeating `.oxd-input-group` wrapper that
 * pairs an `.oxd-label` with its control. Addressing controls through their visible
 * label — rather than generated class names or brittle nth-child chains — keeps the
 * page objects readable and resilient across releases.
 */
export abstract class BasePage {
  protected constructor(protected readonly page: Page) {}

  /** Toast banner OrangeHRM raises after every create, update or delete. */
  protected get toast(): Locator {
    return this.page.locator('.oxd-toast');
  }

  protected get loadingSpinner(): Locator {
    return this.page.locator('.oxd-loading-spinner');
  }

  /** Breadcrumb shown in the top bar, e.g. "PIM" or "Dashboard". */
  protected get moduleBreadcrumb(): Locator {
    return this.page.locator('.oxd-topbar-header-breadcrumb h6');
  }

  /**
   * Navigates to an application path and waits for the page to settle.
   *
   * @param urlPath Path relative to the configured `baseURL`.
   */
  protected async navigateTo(urlPath: string): Promise<void> {
    await this.page.goto(urlPath, { waitUntil: 'domcontentloaded' });
    await this.waitUntilSettled();
  }

  /** Waits for OrangeHRM's loading spinner to clear before interacting with the page. */
  async waitUntilSettled(): Promise<void> {
    await this.loadingSpinner
      .first()
      .waitFor({ state: 'hidden', timeout: 30_000 })
      .catch(() => {
        // The spinner is short-lived and often never renders — absence is success.
      });
  }

  /** Locates the `.oxd-input-group` whose label matches exactly. */
  protected fieldGroup(label: string): Locator {
    return this.page
      .locator('.oxd-input-group')
      .filter({ has: this.page.locator('label', { hasText: exactText(label) }) });
  }

  /** Text input belonging to the field labelled `label`. */
  protected textField(label: string): Locator {
    return this.fieldGroup(label).locator('input').first();
  }

  /**
   * Selects a value from an OrangeHRM `oxd-select` dropdown and asserts the
   * selection actually stuck — these widgets silently ignore clicks while the
   * option list is still rendering.
   */
  protected async selectDropdownOption(label: string, optionText: string): Promise<void> {
    const group = this.fieldGroup(label);

    await group.locator('.oxd-select-text').click();

    const option = this.page.locator('.oxd-select-dropdown [role="option"]').filter({ hasText: exactText(optionText) });

    await expect(option, `Dropdown "${label}" should offer the option "${optionText}"`).toHaveCount(1);
    await option.click();

    await expect(
      group.locator('.oxd-select-text-input'),
      `Dropdown "${label}" should display the selected value "${optionText}"`,
    ).toHaveText(optionText);
  }

  /** Reads the currently selected value of an `oxd-select` dropdown. */
  protected async readDropdownValue(label: string): Promise<string> {
    return (await this.fieldGroup(label).locator('.oxd-select-text-input').innerText()).trim();
  }

  /**
   * Runs an action and returns the text of the toast it raises.
   *
   * OrangeHRM toasts auto-dismiss after a few seconds, so the listener is armed
   * *before* the action and reads the banner the instant it appears. Looking for
   * the toast after the fact is inherently racy and was the cause of flaky runs.
   *
   * @returns The toast text, or an empty string if no toast appeared.
   */
  protected async captureToastDuring(action: () => Promise<void>): Promise<string> {
    const toast = this.toast.first();

    const toastText = toast.waitFor({ state: 'visible', timeout: 30_000 }).then(
      () => toast.innerText().catch(() => ''),
      () => '',
    );

    await action();

    return (await toastText).trim();
  }

  /**
   * Asserts the message OrangeHRM reported for a completed action.
   *
   * @param actualMessage Text captured by {@link captureToastDuring}.
   * @param expectedMessage Substring such as "Successfully Saved".
   */
  expectToastMessage(actualMessage: string, expectedMessage: string): void {
    expect(actualMessage, `OrangeHRM should confirm the action with a "${expectedMessage}" toast`).toContain(
      expectedMessage,
    );
  }

  /** Dismisses any visible toast so it cannot obscure the next interaction. */
  async dismissToast(): Promise<void> {
    const closeButton = this.toast.locator('.oxd-toast-close-container');

    if (
      await closeButton
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await closeButton
        .first()
        .click()
        .catch(() => undefined);
    }

    await this.toast
      .first()
      .waitFor({ state: 'hidden', timeout: 10_000 })
      .catch(() => undefined);
  }
}

/** Builds a whitespace-tolerant exact-match regular expression for locator filters. */
export function exactText(value: string): RegExp {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^\\s*${escaped}\\s*$`);
}
