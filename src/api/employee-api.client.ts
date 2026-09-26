import type { APIRequestContext, APIResponse } from '@playwright/test';

import type {
  ApiCallResult,
  ApiEmployeeSummary,
  ApiEnvelope,
  ApiJobDetails,
  ApiPersonalDetails,
} from '@/types/employee.types';
import { attachJson } from '@/utils/report-attachments';

/**
 * Thin client over the OrangeHRM `/api/v2` REST endpoints that back the web UI.
 *
 * It is constructed from the browser context's own `APIRequestContext`, so it
 * reuses the session cookie established by the UI login. That is deliberate:
 * it lets the test cross-check the UI against the very API the UI itself calls,
 * and it means logging out genuinely invalidates the API client too.
 */
export class EmployeeApiClient {
  private static readonly API_ROOT = '/web/index.php/api/v2';

  constructor(private readonly request: APIRequestContext) {}

  /** `GET /pim/employees/{empNumber}/personal-details` */
  async getPersonalDetails(empNumber: string): Promise<ApiCallResult<ApiPersonalDetails>> {
    return this.getJson<ApiPersonalDetails>(
      `${EmployeeApiClient.API_ROOT}/pim/employees/${empNumber}/personal-details`,
      'API · personal details',
    );
  }

  /** `GET /pim/employees/{empNumber}/job-details` */
  async getJobDetails(empNumber: string): Promise<ApiCallResult<ApiJobDetails>> {
    return this.getJson<ApiJobDetails>(
      `${EmployeeApiClient.API_ROOT}/pim/employees/${empNumber}/job-details`,
      'API · job details',
    );
  }

  /**
   * Searches the employee directory by Employee Id.
   *
   * The server-side filter is applied and the result is filtered again locally,
   * so the outcome is exact regardless of how the endpoint interprets the query.
   */
  async findByEmployeeId(employeeId: string): Promise<ApiEmployeeSummary[]> {
    const query = new URLSearchParams({
      limit: '50',
      offset: '0',
      model: 'detailed',
      includeEmployees: 'onlyCurrent',
      employeeId,
    });

    const result = await this.getJson<ApiEmployeeSummary[]>(
      `${EmployeeApiClient.API_ROOT}/pim/employees?${query.toString()}`,
      `API · search employeeId=${employeeId}`,
    );

    const employees = Array.isArray(result.data) ? result.data : [];

    return employees.filter((employee) => employee.employeeId?.trim() === employeeId);
  }

  /** Fetches the stored profile picture, proving the upload reached the server. */
  async getProfilePicture(empNumber: string): Promise<{ status: number; contentType: string; byteLength: number }> {
    const response = await this.request.get(`/web/index.php/pim/viewPhoto/empNumber/${empNumber}`);
    const body = await response.body();

    return {
      status: response.status(),
      contentType: response.headers()['content-type'] ?? '',
      byteLength: body.byteLength,
    };
  }

  /**
   * Reports whether the current session is still authenticated.
   *
   * OrangeHRM answers unauthenticated API calls with a redirect to the login
   * page, so a JSON response is the reliable signal — not the status code alone.
   */
  async isSessionActive(): Promise<boolean> {
    const response = await this.request.get(`${EmployeeApiClient.API_ROOT}/pim/employees?limit=1&offset=0`);
    const isJson = (response.headers()['content-type'] ?? '').includes('application/json');
    const landedOnLogin = response.url().includes('/auth/login');

    await attachJson('API · session probe after logout', {
      status: response.status(),
      finalUrl: response.url(),
      contentType: response.headers()['content-type'] ?? null,
    });

    return response.ok() && isJson && !landedOnLogin;
  }

  /**
   * Best-effort teardown used when a test fails before it reaches its own
   * delete step, so the shared demo instance is not left littered with records.
   */
  async deleteEmployeeQuietly(empNumber: string): Promise<void> {
    try {
      await this.request.delete(`${EmployeeApiClient.API_ROOT}/pim/employees`, {
        data: { ids: [Number(empNumber)] },
      });
    } catch {
      // Teardown must never mask the real failure — the record can be removed manually.
    }
  }

  /** Issues a GET, normalises the outcome and attaches the evidence to the report. */
  private async getJson<T>(url: string, attachmentName: string): Promise<ApiCallResult<T>> {
    const response = await this.request.get(url);
    const result = await EmployeeApiClient.toResult<T>(response);

    await attachJson(attachmentName, { url, status: result.status, body: safeParse(result.body) });

    return result;
  }

  private static async toResult<T>(response: APIResponse): Promise<ApiCallResult<T>> {
    const body = await response.text();
    const parsed = safeParse(body) as ApiEnvelope<T> | null;

    return {
      status: response.status(),
      ok: response.ok(),
      data: parsed && typeof parsed === 'object' && 'data' in parsed ? parsed.data : null,
      body,
    };
  }
}

function safeParse(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}
