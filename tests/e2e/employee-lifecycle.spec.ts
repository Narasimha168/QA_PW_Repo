import { env } from '@/config/env';
import { loadEmployeeScenarios, withUniqueEmployeeId } from '@/data/employee-data.provider';
import { expect, test } from '@/fixtures/app.fixtures';
import { DashboardPage } from '@/pages/dashboard.page';

/**
 * End-to-end: Employee Lifecycle Management.
 *
 * One employee is taken through create &rarr; edit &rarr; verify &rarr; delete, with the
 * OrangeHRM REST API used as an independent oracle at every checkpoint. The
 * scenario is driven entirely by `test-data/employees.json`, so adding a record
 * there adds a test case here.
 */

const scenarios = loadEmployeeScenarios();

/** empNumbers created by the currently running test, used for best-effort teardown. */
const createdEmpNumbers = new Map<string, string>();

test.describe('Employee Lifecycle Management', () => {
  test.afterEach(async ({ employeeApi }, testInfo) => {
    const orphanedEmpNumber = createdEmpNumbers.get(testInfo.testId);

    if (!orphanedEmpNumber) return;

    // The test did not reach its own delete step (it failed earlier), so remove
    // the record here to keep the shared demo instance clean for the next run.
    await employeeApi.deleteEmployeeQuietly(orphanedEmpNumber);
    createdEmpNumbers.delete(testInfo.testId);
  });

  for (const scenario of scenarios) {
    test(`${scenario.scenario}: ${scenario.firstName} ${scenario.lastName}`, async ({
      page,
      loginPage,
      dashboardPage,
      addEmployeePage,
      personalDetailsPage,
      jobDetailsPage,
      employeeListPage,
      employeeApi,
    }, testInfo) => {
      // Bound here rather than at collection time so test titles stay stable and
      // a retry never reuses the Employee Id of a failed attempt.
      const employee = withUniqueEmployeeId(scenario);
      let empNumber = '';

      testInfo.annotations.push({ type: 'employeeId', description: employee.employeeId });

      await test.step('1. Log in with valid credentials', async () => {
        await loginPage.open();
        await loginPage.login(env.credentials.username, env.credentials.password);

        await dashboardPage.expectLoaded();
      });

      await test.step('2. Add a new employee from the data file', async () => {
        await dashboardPage.openModule('PIM');
        await addEmployeePage.openFromPimTopBar();

        await addEmployeePage.fillPersonalInformation(employee);
        await addEmployeePage.uploadProfilePicture(employee.profilePicturePath);

        const saveResult = await addEmployeePage.save();

        empNumber = saveResult.empNumber;
        createdEmpNumbers.set(testInfo.testId, empNumber);
        testInfo.annotations.push({ type: 'empNumber', description: empNumber });

        addEmployeePage.expectToastMessage(saveResult.toastMessage, 'Successfully Saved');

        await personalDetailsPage.expectLoaded();
        await personalDetailsPage.expectMatchesScenario(employee);
        await personalDetailsPage.dismissToast();
      });

      await test.step('2b. Confirm the new record is discoverable in the Employee List', async () => {
        await employeeListPage.openViaMenu();
        await employeeListPage.searchByEmployeeId(employee.employeeId);

        await employeeListPage.expectSingleMatch(employee);
      });

      await test.step('3. Edit the employee job title and employment status', async () => {
        await employeeListPage.openEmployeeRecord(employee.employeeId);
        await personalDetailsPage.openTab('Job');
        await jobDetailsPage.expectLoaded();

        const updateToast = await jobDetailsPage.updateJobInformation({
          jobTitle: employee.jobTitle,
          employmentStatus: employee.employmentStatus,
        });

        jobDetailsPage.expectToastMessage(updateToast, 'Successfully Updated');

        await jobDetailsPage.expectJobDetailsPersisted({
          jobTitle: employee.jobTitle,
          employmentStatus: employee.employmentStatus,
        });
      });

      await test.step('4. Cross-check the employee against the OrangeHRM REST API', async () => {
        const personalDetails = await employeeApi.getPersonalDetails(empNumber);

        expect(
          personalDetails.status,
          `GET personal-details for empNumber ${empNumber} should succeed. Body: ${personalDetails.body}`,
        ).toBe(200);
        expect(personalDetails.data, 'The personal-details response should carry a data payload').not.toBeNull();
        expect(personalDetails.data?.firstName, 'API First Name should match the data file').toBe(employee.firstName);
        expect(personalDetails.data?.lastName, 'API Last Name should match the data file').toBe(employee.lastName);
        expect(personalDetails.data?.employeeId, 'API Employee Id should match the generated id').toBe(
          employee.employeeId,
        );

        const jobDetails = await employeeApi.getJobDetails(empNumber);

        expect(
          jobDetails.status,
          `GET job-details for empNumber ${empNumber} should succeed. Body: ${jobDetails.body}`,
        ).toBe(200);
        expect(jobDetails.data?.jobTitle?.title, 'API Job Title should reflect the UI update').toBe(employee.jobTitle);
        expect(jobDetails.data?.empStatus?.name, 'API Employment Status should reflect the UI update').toBe(
          employee.employmentStatus,
        );

        // UI vs API consistency: compare what the browser is rendering right now
        // with what the API independently reports for the same record.
        const uiJobDetails = await jobDetailsPage.readJobDetails();

        expect(uiJobDetails.jobTitle, 'Job Title shown in the UI should equal the API value').toBe(
          jobDetails.data?.jobTitle?.title,
        );
        expect(uiJobDetails.employmentStatus, 'Employment Status shown in the UI should equal the API value').toBe(
          jobDetails.data?.empStatus?.name,
        );

        await personalDetailsPage.open(empNumber);
        const uiIdentity = await personalDetailsPage.readIdentity();

        expect(uiIdentity.firstName, 'First Name shown in the UI should equal the API value').toBe(
          personalDetails.data?.firstName,
        );
        expect(uiIdentity.lastName, 'Last Name shown in the UI should equal the API value').toBe(
          personalDetails.data?.lastName,
        );
        expect(uiIdentity.employeeId, 'Employee Id shown in the UI should equal the API value').toBe(
          personalDetails.data?.employeeId,
        );

        const searchResults = await employeeApi.findByEmployeeId(employee.employeeId);

        expect(
          searchResults,
          `The API directory should list exactly one employee for ${employee.employeeId}`,
        ).toHaveLength(1);
        expect(searchResults[0]?.empNumber, 'The API search should resolve to the empNumber created by the UI').toBe(
          Number(empNumber),
        );

        const profilePicture = await employeeApi.getProfilePicture(empNumber);

        expect(profilePicture.status, 'The uploaded profile picture should be retrievable').toBe(200);
        expect(profilePicture.contentType, 'The stored profile picture should be served as an image').toContain(
          'image',
        );
        expect(
          profilePicture.byteLength,
          `The stored photo should be byte-identical to the uploaded file ${employee.profilePicture}`,
        ).toBe(employee.profilePictureByteLength);
      });

      await test.step('5. Delete the employee and verify removal in the UI and the API', async () => {
        await employeeListPage.open();
        await employeeListPage.searchByEmployeeId(employee.employeeId);
        const deleteToast = await employeeListPage.deleteEmployee(employee.employeeId);

        employeeListPage.expectToastMessage(deleteToast, 'Successfully Deleted');
        await employeeListPage.dismissToast();

        // The record is gone from the server, so teardown has nothing left to do.
        createdEmpNumbers.delete(testInfo.testId);

        await employeeListPage.searchByEmployeeId(employee.employeeId);
        await employeeListPage.expectNoMatches(employee.employeeId);

        const searchResults = await employeeApi.findByEmployeeId(employee.employeeId);

        expect(searchResults, `The API should no longer return Employee Id ${employee.employeeId}`).toHaveLength(0);

        const personalDetailsAfterDelete = await employeeApi.getPersonalDetails(empNumber);

        expect(
          personalDetailsAfterDelete.ok,
          `Fetching the deleted empNumber ${empNumber} should not succeed. Status: ${personalDetailsAfterDelete.status}`,
        ).toBe(false);
      });

      await test.step('6. Log out and confirm the session is invalidated', async () => {
        await dashboardPage.logout();
        await loginPage.expectLoaded();

        // A protected route must not be reachable once the session is destroyed.
        await page.goto(DashboardPage.PATH, { waitUntil: 'domcontentloaded' });

        await expect(page, 'Requesting the dashboard after logout should redirect to the login page').toHaveURL(
          /\/auth\/login/,
        );

        const sessionStillActive = await employeeApi.isSessionActive();

        expect(sessionStillActive, 'The API session must be rejected after logging out').toBe(false);
      });
    });
  }
});
