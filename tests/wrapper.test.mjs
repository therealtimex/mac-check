import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

test('downloadable zsh collector runs end to end on macOS', { skip: process.platform !== 'darwin', timeout: 120000 }, () => {
  const temporary = mkdtempSync(join(tmpdir(), 'mac-check-wrapper-'));
  const output = join(temporary, 'reports with spaces');
  mkdirSync(output);
  try {
    const result = spawnSync('/bin/zsh', [
      fileURLToPath(new URL('../dist/mac-check.command', import.meta.url)),
      'mc-wrapper-1234'
    ], {
      env: { ...process.env, MACCHECK_OUTPUT_DIR: output },
      encoding: 'utf8',
      timeout: 110000
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const files = readdirSync(output).filter(name => /^mac-check-report-.*\.json$/.test(name));
    assert.equal(files.length, 1, 'The shell wrapper must save one report in the selected directory.');
    const path = join(output, files[0]);
    const report = JSON.parse(readFileSync(path, 'utf8'));
    assert.equal(report.schema, 'mac-check/v1');
    assert.equal(report.challenge, 'MC-WRAPPER-1234');
    assert.ok(report.hardware.memoryGB > 0, 'Live hardware query must report memory.');
    assert.ok(report.hardware.chip, 'Live hardware query must report a chip or CPU.');
    assert.ok(report.macOS, 'Live macOS version query must succeed.');
    assert.ok(Array.isArray(report.storage));
    assert.ok(Array.isArray(report.queryErrors));
    assert.match(report.hardware.serialEnding, /^([A-Z0-9]{4})?$/);
    assert.deepEqual(Object.keys(report.hardware).sort(),
      ['chip', 'memoryGB', 'model', 'modelIdentifier', 'serialEnding']);
    assert.equal(statSync(path).mode & 0o077, 0, 'Saved report must remain private to its owner.');
    assert.match(result.stdout, /Saved locally:/);
    assert.match(result.stdout, /No report was uploaded/);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
