import { expect, Locator, Page } from '@playwright/test';

import { BasePage, exactText } from '@/pages/base.page';

/** The landing page shown immediately after a successful login. */
export class DashboardPage extends BasePage {
  static readonly PATH = '/web/index.php/dashboard/index';

  readonly header: Locator;
  readonly widgets: Locator;
  readonly userDropdown: Locator;
  readonly sideMenu: Locator;

  constructor(page: Page) {
    super(page);
    this.header = this.moduleBreadcrumb;
    this.widgets = page.locator('.orangehrm-dashboard-widget');
    this.userDropdown = page.locator('.oxd-userdropdown-tab');
    this.sideMenu = page.locator('.oxd-sidepanel');
  }

  /** Asserts the authenticated dashboard is fully rendered. */
  async expectLoaded(): Promise<void> {
    await expect(this.page, 'A successful login should land on the dashboard').toHaveURL(/\/dashboard\/index/);
    await expect(this.header, 'The top bar should show the "Dashboard" breadcrumb').toHaveText('Dashboard');
    await expect(this.widgets.first(), 'At least one dashboard widget should be rendered').toBeVisible();
    await expect(this.userDropdown, 'The signed-in user menu should be available').toBeVisible();
  }

  /** Opens a module from the left-hand navigation, e.g. "PIM". */
  async openModule(moduleName: string): Promise<void> {
    await this.sideMenu
      .locator('.oxd-main-menu-item')
      .filter({ hasText: exactText(moduleName) })
      .click();
    await this.waitUntilSettled();
  }

  /** Signs out through the user menu and waits for the login screen. */
  async logout(): Promise<void> {
    await this.userDropdown.click();
    await this.page
      .locator('.oxd-userdropdown-link')
      .filter({ hasText: exactText('Logout') })
      .click();
    await this.page.waitForURL(/\/auth\/login/, { timeout: 60_000 });
  }
}
