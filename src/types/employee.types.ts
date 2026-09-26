/** Domain types shared by the page objects, the API client and the test data. */

/** A single employee record exactly as it is authored in `test-data/employees.json`. */
export interface EmployeeFixtureRecord {
  /** Human readable label used in the test title. */
  scenario: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  /**
   * Employee Id template containing a `{{unique}}` token, expanded at runtime so
   * every execution creates a record that cannot clash with earlier ones.
   */
  employeeIdTemplate: string;
  /** Path to the profile picture, relative to `test-data/`. */
  profilePicture: string;
  /** Values applied during the "edit employee" step. */
  jobTitle: string;
  employmentStatus: string;
}

/** A validated fixture record with its asset path resolved. */
export interface EmployeeScenario extends EmployeeFixtureRecord {
  /** Absolute path to the profile picture on disk. */
  profilePicturePath: string;
  /** Size of that file, used to prove the exact image reached the server. */
  profilePictureByteLength: number;
}

/**
 * A scenario bound to the concrete Employee Id created by the running test.
 * Produced inside the test body, never at collection time.
 */
export interface EmployeeUnderTest extends EmployeeScenario {
  employeeId: string;
}

/** Job details as rendered by the OrangeHRM UI. */
export interface JobDetailsSnapshot {
  jobTitle: string;
  employmentStatus: string;
}

/** Envelope used by every OrangeHRM `/api/v2` endpoint. */
export interface ApiEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
  rels?: unknown[];
}

export interface ApiPersonalDetails {
  empNumber: number;
  firstName: string;
  middleName: string | null;
  lastName: string;
  employeeId: string | null;
  otherId: string | null;
}

export interface ApiNamedEntity {
  id: number;
  name: string;
}

export interface ApiJobTitle {
  id: number;
  title: string;
  isDeleted: boolean;
}

export interface ApiJobDetails {
  empNumber: number;
  joinedDate: string | null;
  jobTitle: ApiJobTitle | null;
  empStatus: ApiNamedEntity | null;
  subunit: ApiNamedEntity | null;
  jobCategory: ApiNamedEntity | null;
}

export interface ApiEmployeeSummary {
  empNumber: number;
  lastName: string;
  firstName: string;
  middleName: string | null;
  employeeId: string | null;
}

/** Normalised result of an API call, safe to assert on even for error responses. */
export interface ApiCallResult<T> {
  status: number;
  ok: boolean;
  /** Parsed `data` property of the envelope, or `null` when the body was not JSON. */
  data: T | null;
  /** Raw response body, retained so failures carry useful diagnostics. */
  body: string;
}
