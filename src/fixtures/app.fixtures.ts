import { test as base } from '@playwright/test';

import { EmployeeApiClient } from '@/api/employee-api.client';
import { AddEmployeePage } from '@/pages/add-employee.page';
import { DashboardPage } from '@/pages/dashboard.page';
import { EmployeeListPage } from '@/pages/employee-list.page';
import { JobDetailsPage } from '@/pages/job-details.page';
import { LoginPage } from '@/pages/login.page';
import { PersonalDetailsPage } from '@/pages/personal-details.page';

/**
 * Page objects and the API client are exposed as fixtures so specs declare what
 * they need instead of wiring objects up by hand. Playwright instantiates only
 * the fixtures a test actually requests.
 */
export interface AppFixtures {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  addEmployeePage: AddEmployeePage;
  personalDetailsPage: PersonalDetailsPage;
  jobDetailsPage: JobDetailsPage;
  employeeListPage: EmployeeListPage;
  /** Shares the browser session, so it is authenticated exactly when the UI is. */
  employeeApi: EmployeeApiClient;
}

export const test = base.extend<AppFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  addEmployeePage: async ({ page }, use) => {
    await use(new AddEmployeePage(page));
  },

  personalDetailsPage: async ({ page }, use) => {
    await use(new PersonalDetailsPage(page));
  },

  jobDetailsPage: async ({ page }, use) => {
    await use(new JobDetailsPage(page));
  },

  employeeListPage: async ({ page }, use) => {
    await use(new EmployeeListPage(page));
  },

  employeeApi: async ({ page }, use) => {
    await use(new EmployeeApiClient(page.request));
  },
});

export { expect } from '@playwright/test';
