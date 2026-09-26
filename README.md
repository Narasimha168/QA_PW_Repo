# OrangeHRM — Employee Lifecycle Automation (Playwright + TypeScript)

End-to-end UI **and** API automation for the [OrangeHRM demo application](https://opensource-demo.orangehrmlive.com/),
built with **Playwright Test**, **TypeScript** and the **Page Object Model**.

The suite drives one complete employee lifecycle — create, edit, verify, delete — and uses the
OrangeHRM REST API as an independent oracle at every checkpoint, so a green run proves the UI and
the backend agree.

---

## Table of contents

- [Scenario coverage](#scenario-coverage)
- [Setup](#setup)
- [Running the tests](#running-the-tests)
- [Reports, videos and traces](#reports-videos-and-traces)
- [Framework structure](#framework-structure)
- [Design decisions](#design-decisions)
- [Configuration](#configuration)
- [Dependencies](#dependencies)
- [Continuous integration](#continuous-integration)
- [Troubleshooting](#troubleshooting)

---

## Scenario coverage

`tests/e2e/employee-lifecycle.spec.ts` implements the assessment scenario as six reported steps.
Each runs as a Playwright `test.step`, so the HTML report shows the workflow as a readable timeline.

| # | Step | What is verified |
|---|------|------------------|
| 1 | **Login** | Valid credentials land on the dashboard; breadcrumb, widgets and user menu are present. |
| 2 | **Add employee** | Navigates PIM → Add Employee, fills first/middle/last name and a unique Employee Id from JSON, uploads a profile picture, asserts the *Successfully Saved* toast and that the saved record matches the input data. |
| 2b | **Record presence** | Searching the Employee List by Employee Id returns exactly one row — `(1) Record Found` — with the expected name. |
| 3 | **Edit job information** | Opens the record from the search result, updates **Job Title** and **Employment Status**, asserts the *Successfully Updated* toast, then **reloads the page** and re-asserts — the only real proof the change persisted. |
| 4 | **API validation** | `GET /api/v2/pim/employees/{id}/personal-details`, `.../job-details` and the directory search are cross-checked against both the JSON test data **and** the values the browser is rendering. The uploaded photo is re-fetched and asserted **byte-identical** to the file on disk. |
| 5 | **Delete** | Deletes via the UI row action, asserts the *Successfully Deleted* toast, then confirms removal **twice**: the UI reports `No Records Found`, and the API returns an empty search plus a non-OK response for the deleted record. |
| 6 | **Logout** | Signs out, confirms the login page, proves a protected route now redirects to login, and proves the **API session is dead** — not merely that the UI navigated away. |

The scenario is **data-driven**: every record in `test-data/employees.json` becomes its own test case —
names, Employee Id pattern, profile picture, job title and employment status all come from that file.
The shipped data file holds a single record, so the default run executes the lifecycle once. Adding a
second employee to the JSON adds a second test case; no code changes are needed.

---

## Setup

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | **16.14+** (18 LTS or newer recommended) |
| npm | 8+ |

> **Note on the pinned Playwright version**
> This project pins `@playwright/test@1.44.1`, the last release that supports Node 16, because the
> machine it was authored on is limited to Node 16. On Node 18+ you can safely bump to the latest
> Playwright — no test code changes are required.

### Install

```bash
git clone <this-repo-url>
cd QA_PW_Repo

npm ci                  # install dependencies (use `npm install` if you have no lockfile)
npm run install:browsers   # download the Chromium build Playwright drives
```

No further configuration is needed — the suite targets the public OrangeHRM demo with its published
`Admin` / `admin123` credentials out of the box.

---

## Running the tests

```bash
npm test                # full suite, headless (runs typecheck first)
npm run test:headed     # watch it drive a real browser
npm run test:ui         # Playwright UI mode — time-travel debugging
npm run test:debug      # step through with the Playwright Inspector
npm run report          # open the HTML report from the last run
```

Targeting a subset:

```bash
npx playwright test --grep "New QA hire"           # a single data record by name
npx playwright test tests/e2e/employee-lifecycle.spec.ts
```

Quality gates:

```bash
npm run typecheck       # tsc --noEmit
npm run lint            # ESLint + @typescript-eslint + eslint-plugin-playwright
npm run format:check    # Prettier
```

A full run takes roughly **45 seconds** against the public demo.

---

## Reports, videos and traces

Everything a reviewer needs lands under `reports/`:

Everything below is **committed to the repository** — the evidence pack from the latest green run is
part of the deliverable, not a local-only artefact.

| Path | Contents | In repo |
|------|----------|:-------:|
| `reports/html-report/index.html` | **Playwright HTML report** — step timeline, every assertion, the embedded run video, and the raw API responses attached as JSON. | ✅ |
| `reports/videos/<test-title>.webm` | **Video of the test run**, under a readable name. Recording is `on` for every run, not just failures. | ✅ |
| `reports/junit/results.xml` | JUnit XML for CI dashboards. | ✅ |
| `reports/json/results.json` | Machine-readable results. | ✅ |
| `reports/test-artifacts/` | Playwright's scratch directory: a byte-identical duplicate of each video plus failure-only traces. Regenerated every run. | ❌ ignored |

### How to view the report

**GitHub does not render HTML files in the browser** — opening `index.html` on github.com shows the
source, not the report. To actually view it:

```bash
git clone <this-repo-url> && cd QA_PW_Repo
npm ci
npm run report          # serves reports/html-report over HTTP and opens it
```

Or download the repo as a ZIP and open `reports/html-report/index.html` directly.

> Prefer `npm run report` over double-clicking the file: browsers restrict some `file://` assets, which
> can stop the embedded video from playing.

**The video needs no setup at all** — `reports/videos/new-qa-hire-aarav-sharma.webm` is a standalone
WebM. Download it from GitHub and play it in any browser or media player.

Traces are retained on failure only. When one exists, open it with:

```bash
npx playwright show-trace reports/test-artifacts/<test-dir>/trace.zip
```

---

## Framework structure

```
QA_PW_Repo/
├── playwright.config.ts          # runner, reporters, artefact + timeout policy
├── tsconfig.json                 # strict TS, `@/*` path alias → src/
├── .eslintrc.json / .prettierrc.json
├── .env.example                  # documented environment overrides
│
├── src/
│   ├── api/
│   │   └── employee-api.client.ts    # typed OrangeHRM /api/v2 client
│   ├── config/
│   │   └── env.ts                    # single source of environment config
│   ├── data/
│   │   └── employee-data.provider.ts # loads + validates JSON, binds unique ids
│   ├── fixtures/
│   │   └── app.fixtures.ts           # page objects & API client as test fixtures
│   ├── reporters/
│   │   └── video-collector.reporter.ts  # publishes run videos under readable names
│   ├── pages/                        # Page Object Model
│   │   ├── base.page.ts              # shared locator strategy + toast handling
│   │   ├── login.page.ts
│   │   ├── dashboard.page.ts
│   │   ├── add-employee.page.ts
│   │   ├── personal-details.page.ts
│   │   ├── job-details.page.ts
│   │   └── employee-list.page.ts
│   ├── types/
│   │   └── employee.types.ts         # domain + API response types
│   └── utils/
│       ├── unique-id.ts              # collision-free Employee Id generation
│       └── report-attachments.ts     # attach API evidence to the report
│
├── test-data/
│   ├── employees.json                # the data that drives the suite
│   └── assets/employee-avatar.png    # profile picture upload fixture
│
├── tests/e2e/
│   └── employee-lifecycle.spec.ts    # the scenario
│
└── reports/                          # committed evidence pack
    ├── html-report/index.html        # Playwright HTML report (video embedded)
    ├── videos/*.webm                 # run recording, readable file name
    ├── junit/results.xml
    └── json/results.json
```

**Layering:** the spec expresses *intent* only. All selectors live in page objects, all HTTP lives in
the API client, and all test input lives in JSON. Changing a selector or a data value never touches
the spec.

---

## Design decisions

A few choices worth calling out, since they are what keep the suite stable against a shared,
public demo server:

**Label-driven locators.** OrangeHRM renders every field as an `.oxd-input-group` wrapping a
`<label>` and its control. `BasePage.fieldGroup(label)` resolves controls through their *visible
label* instead of generated class names or `nth-child` chains, so the page objects read like the UI
and survive markup churn. Where an element has a meaningful accessible name — the delete
confirmation — a role-based locator is used instead.

**Toasts are captured, not polled.** OrangeHRM's confirmation banners auto-dismiss after a few
seconds. Asserting on them *after* the action is a race, and was a real source of flake during
development. `BasePage.captureToastDuring()` arms the listener **before** the action and reads the
banner the instant it appears.

**Explicit hydration waits.** The Personal Details inputs render before the client fetches the
record, so a naive read returns empty strings. The page object waits for the form to be populated
rather than sleeping.

**The API client shares the browser session.** `EmployeeApiClient` is built from `page.request`, so
it reuses the cookie established by the UI login. That is deliberate: it lets the test cross-check
the UI against the very API the UI itself calls, and it means step 6 can prove logging out genuinely
invalidates the session — a fresh API context could not.

**Unique ids are generated inside the test body.** Playwright collects test titles in the main
process and re-reads them in the worker; anything time-derived that leaks into a title makes the two
disagree and the run fails with *"Test not found in the worker process"*. Ids are therefore bound at
runtime via `withUniqueEmployeeId()`, which has the bonus that a retry never collides with the record
its failed attempt left behind.

**Best-effort teardown.** If a test fails before reaching its own delete step, `afterEach` removes
the created employee through the API so the shared demo instance is not left littered.

**Serial execution.** `workers: 1` — the scenario mutates shared server-side state on a public demo,
so serial execution keeps results deterministic and the suite a polite API consumer.

---

## Configuration

Copy `.env.example` to `.env` to override any of the following (all optional):

| Variable | Default | Purpose |
|----------|---------|---------|
| `BASE_URL` | `https://opensource-demo.orangehrmlive.com` | Target instance. |
| `ORANGEHRM_USERNAME` | `Admin` | Login user. |
| `ORANGEHRM_PASSWORD` | `admin123` | Login password. |
| `HEADLESS` | `true` | Set `false` to watch the run. |
| `CI` | unset | When set, enables one retry and `forbidOnly`. |

Credentials are read through `src/config/env.ts` and never hard-coded in a test, so pointing the
suite at a private instance is a configuration change, not a code change.

---

## Dependencies

| Package | Why |
|---------|-----|
| `@playwright/test` | Test runner, browser automation, API testing, HTML reporter, video & trace capture. |
| `typescript` | Static typing across page objects, fixtures and API models. |
| `dotenv` | Loads `.env` overrides. |
| `eslint`, `@typescript-eslint/*`, `eslint-plugin-playwright` | Static analysis and Playwright-specific lint rules. |
| `eslint-config-prettier`, `prettier` | Consistent formatting, no rule conflicts. |
| `@types/node` | Node typings for `fs` / `path` in the data provider. |

All dependencies are dev-only; the project ships no runtime dependencies.

---

## Continuous integration

`.github/workflows/playwright.yml` runs the suite on every push and pull request to `main`, plus a
nightly regression at 02:00 UTC. It installs dependencies, runs typecheck and lint as gates, executes
the suite, and uploads the whole `reports/` directory as a build artifact — report, videos and traces
included. `BASE_URL` and credentials are supplied via repository variables and secrets.

---

## Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| `Test not found in the worker process` | A test title changed between collection and execution. Keep generated values out of `test()` titles. |
| Dropdown option assertion fails on Job Title | The public demo's Job Title list is user-editable and does change. Update `jobTitle` in `test-data/employees.json` to a value the instance offers. |
| Login times out | The public demo is occasionally down or rate-limited. Retry, or point `BASE_URL` at your own instance. |
| Browser download fails behind a proxy | Set `HTTPS_PROXY` before `npm run install:browsers`. |
| Node engine warnings on install | Expected on Node 16; the pinned Playwright version supports it. Upgrade to Node 18+ to silence them. |

---

## Assessment deliverables checklist

- [x] Page Object Model with a reusable `BasePage`
- [x] Data-driven input from JSON, including profile-picture upload
- [x] Descriptive assertion messages on **every** check (57/57 audited)
- [x] API validation cross-checked against the UI
- [x] Playwright Test as the runner
- [x] HTML report, committed at `reports/html-report/index.html`
- [x] Video of the test run, committed at `reports/videos/*.webm` (and embedded in the report)
- [x] Static analysis: strict TypeScript, ESLint, Prettier
- [x] CI pipeline definition
- [x] This README
