import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, copyFileSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

for (const suppliedCode of ['mc-wrapper-1234', null]) {
  test('explicit Terminal launch of quarantined '+(suppliedCode?'raw download with supplied code':'ZIP checker without an extra prompt'),
    { skip:process.platform!=='darwin',timeout:120000 },()=>{
      const temporary=mkdtempSync(join(tmpdir(),'mac-check-wrapper-'));
      const output=join(temporary,'reports with spaces');
      const unpacked=join(temporary,'download with spaces');mkdirSync(output);mkdirSync(unpacked);
      try {
        let checker;
        if(suppliedCode){
          const config=JSON.parse(readFileSync(new URL('../dist/launch.json',import.meta.url),'utf8'));
          checker=join(unpacked,config.fileName);
          copyFileSync(new URL('../dist/'+config.fileName,import.meta.url),checker);
          chmodSync(checker,0o644);
        }else{
          const archive=fileURLToPath(new URL('../dist/mac-check.zip',import.meta.url));
          const extracted=spawnSync('/usr/bin/ditto',['-xk',archive,unpacked],{encoding:'utf8'});
          assert.equal(extracted.status,0,extracted.stderr);
          checker=join(unpacked,'Mac Check.command');
          assert.ok(statSync(checker).mode & 0o100,'Legacy ZIP preserves its executable bit.');
        }
        const quarantine='0083;6ae2d245;MacCheckTest;EFC4785E-0799-4264-8EF9-674090FE0D23';
        const tagged=spawnSync('/usr/bin/xattr',['-w','com.apple.quarantine',quarantine,checker],{encoding:'utf8'});
        assert.equal(tagged.status,0,tagged.stderr);
        // A pseudo-terminal catches a regression that reintroduces the second Return prompt.
        // Explicit zsh invocation reads the script; it does not remove its quarantine attribute.
        const result=spawnSync('/usr/bin/expect',['-c','set timeout 100; spawn -noecho /bin/zsh $env(MACCHECK_TEST_SCRIPT) --run $env(MACCHECK_TEST_CODE); expect { eof {} timeout { exit 124 } }; set result [wait]; exit [lindex $result 3]'],{
          env:{...process.env,MACCHECK_OUTPUT_DIR:output,MACCHECK_OPEN_REPORT:'0',MACCHECK_TEST_SCRIPT:checker,MACCHECK_TEST_CODE:suppliedCode||''},
          encoding:'utf8',timeout:110000
        });
        const retained=spawnSync('/usr/bin/xattr',['-p','com.apple.quarantine',checker],{encoding:'utf8'});
        assert.equal(retained.status,0,retained.stderr);
        assert.equal(retained.stdout.trim(),quarantine);
        assert.ifError(result.error);assert.equal(result.status,0,result.stderr||result.stdout);
        assert(!result.stdout.includes('Enter the check code'));
        assert(!result.stdout.includes('Press Return to check'));
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
