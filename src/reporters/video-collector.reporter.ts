import fs from 'node:fs';
import path from 'node:path';

import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

/**
 * Copies each run's recording out of Playwright's hashed artefact directory into
 * `reports/videos/<test-title>.webm`.
 *
 * Playwright stores videos under `reports/test-artifacts/<hashed-test-dir>/video.webm`
 * and embeds a second copy in the HTML report under an opaque SHA-named file. Neither
 * is browsable, which matters when the recording is a deliverable that a reviewer is
 * expected to find in the repository. This reporter publishes a third, human-readable
 * copy at a stable path.
 *
 * Implemented as a reporter rather than an npm `posttest` hook so it also runs when the
 * suite fails — which is precisely when the recording is most worth keeping.
 */
export default class VideoCollectorReporter implements Reporter {
  private readonly outputFolder: string;
  private readonly collected: Array<{ title: string; retry: number; sourcePath: string }> = [];

  constructor(options: { outputFolder?: string } = {}) {
    this.outputFolder = path.resolve(process.cwd(), options.outputFolder ?? 'reports/videos');
  }

  /** Keeps the `list` reporter in charge of the console. */
  printsToStdio(): boolean {
    return false;
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    for (const attachment of result.attachments) {
      if (attachment.name === 'video' && attachment.path) {
        this.collected.push({ title: test.title, retry: result.retry, sourcePath: attachment.path });
      }
    }
  }

  /**
   * Copying happens here rather than in `onTestEnd` because Playwright finalises
   * the video file only after the browser context is torn down.
   */
  async onEnd(): Promise<void> {
    if (this.collected.length === 0) return;

    fs.rmSync(this.outputFolder, { recursive: true, force: true });
    fs.mkdirSync(this.outputFolder, { recursive: true });

    for (const { title, retry, sourcePath } of this.collected) {
      if (!fs.existsSync(sourcePath)) continue;

      const suffix = retry > 0 ? `-retry-${retry}` : '';
      const fileName = `${toSlug(title)}${suffix}.webm`;

      fs.copyFileSync(sourcePath, path.join(this.outputFolder, fileName));
    }
  }
}

/** Turns a test title into a safe, readable file name. */
function toSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'test'
  );
}
