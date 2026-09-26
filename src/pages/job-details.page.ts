import { expect, Locator, Page } from '@playwright/test';

import { BasePage } from '@/pages/base.page';
import type { JobDetailsSnapshot } from '@/types/employee.types';

/** PIM &rarr; Employee &rarr; Job, where job title and employment status are maintained. */
export class JobDetailsPage extends BasePage {
  private static readonly JOB_TITLE_LABEL = 'Job Title';
  private static readonly EMPLOYMENT_STATUS_LABEL = 'Employment Status';

  readonly saveButton: Locator;

  constructor(page: Page) {
    super(page);
    // The Job tab renders a single editable form; the first Save belongs to it.
    this.saveButton = page.locator('form.oxd-form button[type="submit"]').first();
  }

  static pathFor(empNumber: string): string {
    return `/web/index.php/pim/viewJobDetails/empNumber/${empNumber}`;
  }

  async open(empNumber: string): Promise<void> {
    await this.navigateTo(JobDetailsPage.pathFor(empNumber));
    await this.expectLoaded();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page, 'The browser should be on the employee Job screen').toHaveURL(
      /\/pim\/viewJobDetails\/empNumber\/\d+/,
    );
    await expect(
      this.fieldGroup(JobDetailsPage.JOB_TITLE_LABEL),
      'The Job Title field should be rendered on the Job tab',
    ).toBeVisible();
  }

  /**
   * Applies both job changes and saves them in one reusable step.
   *
   * @returns The confirmation toast text raised by OrangeHRM.
   */
  async updateJobInformation(details: JobDetailsSnapshot): Promise<string> {
    await this.selectDropdownOption(JobDetailsPage.JOB_TITLE_LABEL, details.jobTitle);
    await this.selectDropdownOption(JobDetailsPage.EMPLOYMENT_STATUS_LABEL, details.employmentStatus);

    return this.save();
  }

  /** @returns The confirmation toast text raised by OrangeHRM. */
  async save(): Promise<string> {
    return this.captureToastDuring(async () => {
      await this.saveButton.click();
      await this.waitUntilSettled();
    });
  }

  /** Reads the job details exactly as the UI currently renders them. */
  async readJobDetails(): Promise<JobDetailsSnapshot> {
    return {
      jobTitle: await this.readDropdownValue(JobDetailsPage.JOB_TITLE_LABEL),
      employmentStatus: await this.readDropdownValue(JobDetailsPage.EMPLOYMENT_STATUS_LABEL),
    };
  }

  /**
   * Reloads the page and asserts the expected values survived the round trip —
   * a clean form is the only proof the update actually persisted.
   */
  async expectJobDetailsPersisted(expected: JobDetailsSnapshot): Promise<void> {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.waitUntilSettled();
    await this.expectLoaded();

    await expect(
      this.fieldGroup(JobDetailsPage.JOB_TITLE_LABEL).locator('.oxd-select-text-input'),
      `Job Title should persist as "${expected.jobTitle}" after reloading the page`,
    ).toHaveText(expected.jobTitle);

    await expect(
      this.fieldGroup(JobDetailsPage.EMPLOYMENT_STATUS_LABEL).locator('.oxd-select-text-input'),
      `Employment Status should persist as "${expected.employmentStatus}" after reloading the page`,
    ).toHaveText(expected.employmentStatus);
  }
}
