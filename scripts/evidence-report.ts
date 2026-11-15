/**
 * Generates `docs/EVIDENCE-REVIEW.md` from the knowledge base.
 *
 * Run with `npm run evidence:report`. The report is committed so a reviewer can
 * read it without a toolchain, but it is always regenerated from the data — the
 * committed copy is never edited by hand.
 *
 * Exit code is non-zero when a *blocking* finding exists, so CI can fail on it.
 * Accepted gaps (no official schedule document yet, unreviewed legacy text) do
 * not block; they are listed for the reviewer.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  blockingFindings,
  renderReportMarkdown,
  validateEvidence,
} from '../src/lib/evidenceValidator';

const report = validateEvidence();
const markdown = renderReportMarkdown(report);
const output = resolve(process.cwd(), 'docs/EVIDENCE-REVIEW.md');

mkdirSync(resolve(process.cwd(), 'docs'), { recursive: true });
writeFileSync(output, `${markdown}\n`, 'utf8');

const errors = blockingFindings(report);
process.stdout.write(
  [
    `evidence report written to docs/EVIDENCE-REVIEW.md`,
    `  knowledge base ${report.knowledgeBaseVersion} · schema ${report.schemaVersion}`,
    `  findings: ${report.summary.total} total — ${report.summary.errors} errors, ${report.summary.warnings} warnings, ${report.summary.gaps} accepted gaps`,
    `  unresolved conflicts: ${report.sections.conflictingSources.length}`,
    `  awaiting professional review: ${report.sections.awaitingProfessionalReview.length}`,
    '',
  ].join('\n'),
);

if (errors.length > 0) {
  process.stdout.write(
    `blocking findings:\n${errors.map((f) => `  [${f.code}] ${f.entityId}: ${f.message}\n`).join('')}`,
  );
  process.exitCode = 1;
}
