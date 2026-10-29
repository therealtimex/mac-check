import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

for (const suppliedCode of ['mc-wrapper-1234', null]) {
  test('executable ZIP runs end to end on macOS '+(suppliedCode?'with supplied code':'without a code prompt'),
    { skip:process.platform!=='darwin',timeout:120000 },()=>{
      const temporary=mkdtempSync(join(tmpdir(),'mac-check-wrapper-'));
      const output=join(temporary,'reports with spaces');
      const unpacked=join(temporary,'download with spaces');mkdirSync(output);mkdirSync(unpacked);
      try {
        const archive=fileURLToPath(new URL('../dist/mac-check.zip',import.meta.url));
        const extracted=spawnSync('/usr/bin/ditto',['-xk',archive,unpacked],{encoding:'utf8'});
        assert.equal(extracted.status,0,extracted.stderr);
        const checker=join(unpacked,'Mac Check.command');
        assert.ok(statSync(checker).mode & 0o100,'ZIP must preserve the executable bit.');
        const result=spawnSync(checker,suppliedCode?[suppliedCode]:[],{
          env:{...process.env,MACCHECK_OUTPUT_DIR:output,MACCHECK_OPEN_REPORT:'0'},
          encoding:'utf8',timeout:110000
        });
        assert.ifError(result.error);assert.equal(result.status,0,result.stderr||result.stdout);
        assert(!result.stdout.includes('Enter the check code'));
        const files=readdirSync(output);
        const jsonFiles=files.filter(n=>/^mac-check-report-.*\.json$/.test(n));
        const htmlFiles=files.filter(n=>/^mac-check-report-.*\.html$/.test(n));
        assert.equal(jsonFiles.length,1);assert.equal(htmlFiles.length,1);
        const report=JSON.parse(readFileSync(join(output,jsonFiles[0]),'utf8'));
        assert.equal(report.schema,'mac-check/v1');
        if(suppliedCode)assert.equal(report.challenge,'MC-WRAPPER-1234');
        else assert.match(report.challenge,/^MC-[A-F0-9]{8}$/);
        assert.ok(report.hardware.memoryGB>0);assert.ok(report.hardware.chip);assert.ok(report.macOS);
        assert.match(report.hardware.serialEnding,/^([A-Z0-9]{4})?$/);
        assert.deepEqual(Object.keys(report.hardware).sort(),['chip','memoryGB','model','modelIdentifier','serialEnding']);
        const html=readFileSync(join(output,htmlFiles[0]),'utf8');
        assert.match(html,/Save screenshot/);assert.match(html,/Copy screenshot/);
        assert.ok(html.includes(report.challenge));assert(!/<script[^>]+src=/i.test(html));
        assert.equal(statSync(join(output,jsonFiles[0])).mode & 0o077,0);
        assert.equal(statSync(join(output,htmlFiles[0])).mode & 0o077,0);
        assert.match(result.stdout,/Done\. Your report is ready/);
        assert.match(result.stdout,/No report was uploaded/);
      } finally {rmSync(temporary,{recursive:true,force:true});}
    });
}
