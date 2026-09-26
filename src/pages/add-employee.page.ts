import { expect, Locator, Page } from '@playwright/test';

import { BasePage, exactText } from '@/pages/base.page';
import type { EmployeeUnderTest } from '@/types/employee.types';

/** PIM &rarr; Add Employee. */
export class AddEmployeePage extends BasePage {
  static readonly PATH = '/web/index.php/pim/addEmployee';

  readonly firstNameInput: Locator;
  readonly middleNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly profilePictureInput: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    super(page);
    this.firstNameInput = page.locator('input[name="firstName"]');
    this.middleNameInput = page.locator('input[name="middleName"]');
    this.lastNameInput = page.locator('input[name="lastName"]');
    // The real control is hidden behind a styled button; `setInputFiles` drives it directly.
    this.profilePictureInput = page.locator('input[type="file"]');
    this.saveButton = page.locator('button[type="submit"]');
  }

  get employeeIdInput(): Locator {
    return this.textField('Employee Id');
  }

  async open(): Promise<void> {
    await this.navigateTo(AddEmployeePage.PATH);
    await this.expectLoaded();
  }

  /**
   * Opens the form the way a user does — the "Add Employee" tab inside the PIM
   * module — rather than by deep link.
   */
  async openFromPimTopBar(): Promise<void> {
    await this.page
      .locator('.oxd-topbar-body-nav-tab-item')
      .filter({ hasText: exactText('Add Employee') })
      .click();
    await this.page.waitForURL(/\/pim\/addEmployee/, { timeout: 60_000 });
    await this.waitUntilSettled();
    await this.expectLoaded();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page, 'The browser should be on the Add Employee screen').toHaveURL(/\/pim\/addEmployee/);
    await expect(this.firstNameInput, 'The First Name field should be ready for input').toBeVisible();
  }

  /** Fills the employee's name and overwrites the auto-generated Employee Id. */
  async fillPersonalInformation(employee: EmployeeUnderTest): Promise<void> {
    await this.firstNameInput.fill(employee.firstName);

    if (employee.middleName) {
      await this.middleNameInput.fill(employee.middleName);
    }

    await this.lastNameInput.fill(employee.lastName);

    // OrangeHRM pre-populates this field with the next sequential id, so clear it first.
    await this.employeeIdInput.fill('');
    await this.employeeIdInput.fill(employee.employeeId);

    await expect(
      this.employeeIdInput,
      `The Employee Id field should hold the generated id "${employee.employeeId}"`,
    ).toHaveValue(employee.employeeId);
  }

  /**
   * Attaches the profile picture. The visible control is a styled button, so the
   * file is pushed straight into the hidden `<input type="file">`.
   *
   * @param absolutePath Absolute path to a jpg/png/gif under 1 MB.
   */
  async uploadProfilePicture(absolutePath: string): Promise<void> {
    await this.profilePictureInput.setInputFiles(absolutePath);

    const attachedFileCount = await this.profilePictureInput.evaluate(
      (input) => (input as HTMLInputElement).files?.length ?? 0,
    );

    expect(attachedFileCount, 'Exactly one profile picture should be attached to the form').toBe(1);
  }

  /**
   * Saves the new employee and waits for the redirect to their personal details.
   *
   * @returns The `empNumber` OrangeHRM assigned, plus the confirmation toast text.
   */
  async save(): Promise<{ empNumber: string; toastMessage: string }> {
    const toastMessage = await this.captureToastDuring(async () => {
      await this.saveButton.click();
      await this.page.waitForURL(/\/pim\/viewPersonalDetails\/empNumber\/\d+/, { timeout: 60_000 });
    });

    const empNumber = AddEmployeePage.extractEmpNumber(this.page.url());

    if (!empNumber) {
      throw new Error(`Could not read the assigned empNumber from the URL: ${this.page.url()}`);
    }

    return { empNumber, toastMessage };
  }

  /** Pulls the numeric `empNumber` out of a PIM URL. */
  static extractEmpNumber(url: string): string | null {
    return /\/empNumber\/(\d+)/.exec(url)?.[1] ?? null;
  }
}
