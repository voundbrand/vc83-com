#!/usr/bin/env node

import fs from "node:fs";

const reportPath = process.argv[2] ?? "tmp/test-results/ui-visual/results.json";

function sanitize(value) {
  return String(value ?? "")
    .replace(/\|/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

function parseField(title, key) {
  const match = title.match(new RegExp(`\\b${key}=([^\\s]+)`));
  return match ? match[1] : "unknown";
}

function normalizeStatus(status) {
  if (status === "passed") {
    return "PASS";
  }
  if (status === "skipped") {
    return "SKIP";
  }
  return "FAIL";
}

function walkSuites(suites, trail, rows) {
  for (const suite of suites ?? []) {
    const nextTrail = suite.title ? [...trail, suite.title] : trail;

    for (const spec of suite.specs ?? []) {
      const title = sanitize([...nextTrail, spec.title].filter(Boolean).join(" "));
      for (const testRun of spec.tests ?? []) {
        const results = testRun.results ?? [];
        const finalResult = results.at(-1);
        const status = normalizeStatus(finalResult?.status ?? "failed");
        const attachments = (finalResult?.attachments ?? [])
          .map((attachment) => attachment?.path)
          .filter((path) => typeof path === "string")
          .map((path) => sanitize(path));

        rows.push({
          status,
          title,
          project: sanitize(testRun.projectName ?? "default"),
          screen: parseField(title, "screen"),
          mode: parseField(title, "mode"),
          token: parseField(title, "token"),
          artifacts: attachments.length > 0 ? attachments.join(",") : "none",
        });
      }
    }

    walkSuites(suite.suites ?? [], nextTrail, rows);
  }
}

if (!fs.existsSync(reportPath)) {
  console.log(`UI_VISUAL_SUMMARY|status=FAIL|reason=missing_report|report=${sanitize(reportPath)}`);
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const rows = [];
walkSuites(report.suites ?? [], [], rows);

if (rows.length === 0) {
  console.log(`UI_VISUAL_SUMMARY|status=FAIL|reason=no_test_rows|report=${sanitize(reportPath)}`);
  process.exit(1);
}

let passed = 0;
let failed = 0;
let skipped = 0;

for (const row of rows) {
  if (row.status === "PASS") {
    passed += 1;
  } else if (row.status === "FAIL") {
    failed += 1;
  } else {
    skipped += 1;
  }

  console.log(
    `UI_VISUAL_RESULT|status=${row.status}|screen=${row.screen}|mode=${row.mode}|token=${row.token}|project=${row.project}|title=${row.title}|artifacts=${row.artifacts}`,
  );
}

const summaryStatus = failed > 0 ? "FAIL" : "PASS";
console.log(
  `UI_VISUAL_SUMMARY|status=${summaryStatus}|total=${rows.length}|passed=${passed}|failed=${failed}|skipped=${skipped}|report=${sanitize(reportPath)}`,
);

if (failed > 0) {
  process.exit(1);
}
