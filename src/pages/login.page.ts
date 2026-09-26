import { expect, Locator, Page } from '@playwright/test';

import { BasePage } from '@/pages/base.page';

/** The OrangeHRM authentication screen. */
export class LoginPage extends BasePage {
  static readonly PATH = '/web/index.php/auth/login';

  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.locator('input[name="username"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorAlert = page.locator('.oxd-alert-content-text');
  }

  async open(): Promise<void> {
    await this.navigateTo(LoginPage.PATH);
    await this.expectLoaded();
  }

  /**
   * Submits valid credentials and waits for the dashboard redirect.
   *
   * Use {@link submitCredentials} instead when the login is expected to fail.
   */
  async login(username: string, password: string): Promise<void> {
    await this.submitCredentials(username, password);
    await this.page.waitForURL(/\/dashboard\/index/, { timeout: 60_000 });
  }

  /** Fills and submits the form without assuming the outcome. */
  async submitCredentials(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page, 'The browser should be on the OrangeHRM login page').toHaveURL(/\/auth\/login/);
    await expect(this.usernameInput, 'The username field should be visible on the login page').toBeVisible();
    await expect(this.passwordInput, 'The password field should be visible on the login page').toBeVisible();
  }
}
