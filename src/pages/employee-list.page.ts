import { expect, Locator, Page } from '@playwright/test';

import { BasePage, exactText } from '@/pages/base.page';
import type { EmployeeUnderTest } from '@/types/employee.types';

/** PIM &rarr; Employee List: search, open and delete employee records. */
export class EmployeeListPage extends BasePage {
  static readonly PATH = '/web/index.php/pim/viewEmployeeList';

  readonly searchButton: Locator;
  readonly resetButton: Locator;
  readonly resultRows: Locator;
  /** Renders either "(n) Records Found" or "No Records Found" above the table. */
  readonly resultSummary: Locator;
  readonly confirmDeleteButton: Locator;

  constructor(page: Page) {
    super(page);
    this.searchButton = page.locator('button[type="submit"]');
    this.resetButton = page.locator('button[type="reset"]');
    this.resultRows = page.locator('.oxd-table-card');
    this.resultSummary = page.locator('.orangehrm-horizontal-padding .oxd-text--span').first();
    // Role-based: the confirmation button carries an icon, so its accessible
    // name is the reliable handle rather than the modal's generated classes.
    this.confirmDeleteButton = page.getByRole('button', { name: /Yes,\s*Delete/i });
  }

  get employeeIdFilter(): Locator {
    return this.textField('Employee Id');
  }

  async open(): Promise<void> {
    await this.navigateTo(EmployeeListPage.PATH);
    await this.expectLoaded();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page, 'The browser should be on the PIM Employee List').toHaveURL(/\/pim\/viewEmployeeList/);
    await expect(this.employeeIdFilter, 'The Employee Id search filter should be available').toBeVisible();
  }

  /** Runs the Employee Id filter and waits for the result table to refresh. */
  async searchByEmployeeId(employeeId: string): Promise<void> {
    await this.employeeIdFilter.fill('');
    await this.employeeIdFilter.fill(employeeId);
    await this.searchButton.click();
    await this.waitUntilSettled();
  }

  /** The single result row containing the given Employee Id. */
  rowFor(employeeId: string): Locator {
    return this.resultRows.filter({ hasText: employeeId });
  }

  /** Asserts the search returned exactly one row and that it holds the expected data. */
  async expectSingleMatch(employee: EmployeeUnderTest): Promise<void> {
    const row = this.rowFor(employee.employeeId);

    await expect(row, `Searching by Employee Id "${employee.employeeId}" should return exactly one record`).toHaveCount(
      1,
    );

    await expect(row, 'The matching row should show the employee first name').toContainText(employee.firstName);
    await expect(row, 'The matching row should show the employee last name').toContainText(employee.lastName);
    await expect(this.resultSummary, 'The list should report exactly one matching record').toHaveText(
      '(1) Record Found',
    );
  }

  /** Asserts the search returned nothing — used to prove a deletion took effect. */
  async expectNoMatches(employeeId: string): Promise<void> {
    await expect(
      this.rowFor(employeeId),
      `No record should remain for the deleted Employee Id "${employeeId}"`,
    ).toHaveCount(0);

    await expect(
      this.resultSummary,
      'The Employee List should report "No Records Found" after the deletion',
    ).toHaveText('No Records Found');
  }

  /** Opens the matching employee's record by clicking their row. */
  async openEmployeeRecord(employeeId: string): Promise<void> {
    await this.rowFor(employeeId).locator('.oxd-table-cell').nth(1).click();
    await this.page.waitForURL(/\/pim\/viewPersonalDetails\/empNumber\/\d+/, { timeout: 60_000 });
    await this.waitUntilSettled();
  }

  /**
   * Deletes the matching employee through the row action and confirms the dialog.
   *
   * @returns The confirmation toast text raised by OrangeHRM.
   */
  async deleteEmployee(employeeId: string): Promise<string> {
    const row = this.rowFor(employeeId);

    await expect(row, `A row for Employee Id "${employeeId}" should exist before deleting it`).toHaveCount(1);

    await row.locator('button', { has: this.page.locator('i.bi-trash') }).click();

    await expect(this.confirmDeleteButton, 'A delete confirmation dialog should be displayed').toBeVisible();

    return this.captureToastDuring(async () => {
      await this.confirmDeleteButton.click();
      await this.waitUntilSettled();
    });
  }

  /** Navigates to the Employee List using the left-hand PIM menu. */
  async openViaMenu(): Promise<void> {
    await this.page
      .locator('.oxd-main-menu-item')
      .filter({ hasText: exactText('PIM') })
      .click();
    await this.page.waitForURL(/\/pim\/viewEmployeeList/, { timeout: 60_000 });
    await this.waitUntilSettled();
  }
}
