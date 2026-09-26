import fs from 'node:fs';
import path from 'node:path';

import type { EmployeeFixtureRecord, EmployeeScenario, EmployeeUnderTest } from '@/types/employee.types';
import { expandUniqueToken } from '@/utils/unique-id';

/** Root of the external test data, kept outside `src/` so data can change without a code change. */
export const TEST_DATA_DIR = path.resolve(__dirname, '..', '..', 'test-data');

/** Upload ceiling enforced by the OrangeHRM profile picture field. */
const ONE_MEGABYTE = 1024 * 1024;

/**
 * Loads and validates the data-driven employee records.
 *
 * Runs at collection time, so it must stay deterministic — the unique Employee Id
 * is applied later by {@link withUniqueEmployeeId} from inside the test body.
 *
 * @param fileName Data file inside `test-data/`. Override to run a different data set.
 */
export function loadEmployeeScenarios(fileName = 'employees.json'): EmployeeScenario[] {
  const filePath = path.join(TEST_DATA_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Test data file not found: ${filePath}`);
  }

  return parseRecords(fs.readFileSync(filePath, 'utf-8'), filePath).map((record, index) =>
    toScenario(record, index, filePath),
  );
}

/**
 * Binds a scenario to a freshly generated Employee Id.
 *
 * Call this inside a test, never while building test titles.
 */
export function withUniqueEmployeeId(scenario: EmployeeScenario): EmployeeUnderTest {
  return { ...scenario, employeeId: expandUniqueToken(scenario.employeeIdTemplate) };
}

function parseRecords(raw: string, filePath: string): EmployeeFixtureRecord[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Test data file ${filePath} is not valid JSON: ${(error as Error).message}`);
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`Test data file ${filePath} must contain a non-empty array of employee records.`);
  }

  return parsed as EmployeeFixtureRecord[];
}

function toScenario(record: EmployeeFixtureRecord, index: number, filePath: string): EmployeeScenario {
  const requiredFields: Array<keyof EmployeeFixtureRecord> = [
    'scenario',
    'firstName',
    'lastName',
    'employeeIdTemplate',
    'profilePicture',
    'jobTitle',
    'employmentStatus',
  ];

  for (const field of requiredFields) {
    if (!record[field]) {
      throw new Error(`Record #${index + 1} in ${filePath} is missing the required field "${field}".`);
    }
  }

  if (!record.employeeIdTemplate.includes('{{unique}}')) {
    throw new Error(
      `Record #${index + 1} in ${filePath} must include the "{{unique}}" token in "employeeIdTemplate" so runs cannot collide.`,
    );
  }

  const profilePicturePath = path.resolve(TEST_DATA_DIR, record.profilePicture);

  if (!fs.existsSync(profilePicturePath)) {
    throw new Error(`Profile picture for record #${index + 1} was not found at ${profilePicturePath}.`);
  }

  const profilePictureByteLength = fs.statSync(profilePicturePath).size;

  // OrangeHRM rejects anything larger, so fail here with a clear cause rather
  // than debugging an opaque upload failure in the browser.
  if (profilePictureByteLength > ONE_MEGABYTE) {
    throw new Error(
      `Profile picture ${profilePicturePath} is ${profilePictureByteLength} bytes; OrangeHRM accepts at most ${ONE_MEGABYTE}.`,
    );
  }

  return { ...record, profilePicturePath, profilePictureByteLength };
}
