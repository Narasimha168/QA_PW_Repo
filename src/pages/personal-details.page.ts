import { expect, Locator, Page } from '@playwright/test';

import { AddEmployeePage } from '@/pages/add-employee.page';
import { BasePage } from '@/pages/base.page';
import type { EmployeeUnderTest } from '@/types/employee.types';

/** PIM &rarr; Employee &rarr; Personal Details, the screen shown right after a save. */
export class PersonalDetailsPage extends BasePage {
  readonly employeeNameHeading: Locator;
  readonly firstNameInput: Locator;
  readonly middleNameInput: Locator;
  readonly lastNameInput: Locator;

  constructor(page: Page) {
    super(page);
    this.employeeNameHeading = page.locator('.orangehrm-edit-employee-name h6');
    this.firstNameInput = page.locator('input[name="firstName"]');
    this.middleNameInput = page.locator('input[name="middleName"]');
    this.lastNameInput = page.locator('input[name="lastName"]');
  }

  static pathFor(empNumber: string): string {
    return `/web/index.php/pim/viewPersonalDetails/empNumber/${empNumber}`;
  }

  get employeeIdInput(): Locator {
    return this.textField('Employee Id');
  }

  async open(empNumber: string): Promise<void> {
    await this.navigateTo(PersonalDetailsPage.pathFor(empNumber));
    await this.expectLoaded();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page, 'The browser should be on an employee Personal Details screen').toHaveURL(
      /\/pim\/viewPersonalDetails\/empNumber\/\d+/,
    );
    await expect(this.firstNameInput, 'The Personal Details form should be rendered').toBeVisible();
    await this.waitForFormHydration();
  }

  /**
   * The inputs render before the client fetches the record, so a plain read can
   * return an empty string. Wait until the stored data has actually landed.
   */
  private async waitForFormHydration(): Promise<void> {
    await expect(
      this.firstNameInput,
      'The Personal Details form should be populated with the stored employee data',
    ).not.toHaveValue('', { timeout: 20_000 });
  }

  /** The `empNumber` of the record currently open, read from the URL. */
  getEmpNumber(): string {
    const empNumber = AddEmployeePage.extractEmpNumber(this.page.url());

    if (!empNumber) {
      throw new Error(`Current URL does not contain an empNumber: ${this.page.url()}`);
    }

    return empNumber;
  }

  /** Reads the employee's identity exactly as the UI renders it. */
  async readIdentity(): Promise<{ firstName: string; middleName: string; lastName: string; employeeId: string }> {
    await this.waitForFormHydration();

    return {
      firstName: await this.firstNameInput.inputValue(),
      middleName: await this.middleNameInput.inputValue(),
      lastName: await this.lastNameInput.inputValue(),
      employeeId: await this.employeeIdInput.inputValue(),
    };
  }

  /** Asserts the persisted record matches the data the test supplied. */
  async expectMatchesScenario(employee: EmployeeUnderTest): Promise<void> {
    await expect(this.firstNameInput, 'The saved First Name should match the test data').toHaveValue(
      employee.firstName,
    );
    await expect(this.lastNameInput, 'The saved Last Name should match the test data').toHaveValue(employee.lastName);
    await expect(this.employeeIdInput, 'The saved Employee Id should match the generated id').toHaveValue(
      employee.employeeId,
    );
    await expect(
      this.employeeNameHeading,
      'The page heading should show the newly created employee name',
    ).toContainText(employee.lastName);
  }

  /** Opens one of the employee tabs, e.g. "Job" or "Salary". */
  async openTab(tabName: string): Promise<void> {
    await this.page.locator('.orangehrm-tabs-item', { hasText: tabName }).first().click();
    await this.waitUntilSettled();
  }
}
