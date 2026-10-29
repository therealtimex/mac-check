import test from 'node:test';
import assert from 'node:assert/strict';
import { renderReportDocument, reportView } from '../dist/report-page.js';

const base = () => ({
  schema:'mac-check/v1', collectedAt:'2026-10-29T05:00:00Z', challenge:'MC-TEST1234',
  hardware:{model:'Mac mini',modelIdentifier:'Mac16,10',chip:'Apple M4',memoryGB:32,serialEnding:'TEST'},
  macOS:'26.1',activationLock:'disabled',enrollment:{automated:'no',mdm:'no'},
  storage:[{device:'disk0',sizeBytes:500277790720,solidState:true}],queryErrors:[]
});

test('standalone report is local and screenshot-ready without importing JSON',()=>{
  const html=renderReportDocument(base());
  assert.match(html,/Save screenshot/);assert.match(html,/Copy screenshot/);
  assert.match(html,/report-image-data/);assert.match(html,/MC-TEST1234/);
  assert(!html.includes('does not match the current check code'));
  assert(!/<script[^>]+src=/i.test(html));
  assert(!/<link[^>]+stylesheet/i.test(html));
  assert(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon/.test(html));
});

test('HTML report escapes displayed and embedded data and drops private fields',()=>{
  const r=base();r.hardware.model='</h1><script>alert(1)</script>';
  r.hardware.serial='PRIVATE-FULL-SERIAL';r.appleAccount='PRIVATE-ACCOUNT';
  const html=renderReportDocument(r);
  assert(html.includes('&lt;/h1&gt;&lt;script&gt;'));
  assert(!html.includes('PRIVATE-FULL-SERIAL'));assert(!html.includes('PRIVATE-ACCOUNT'));
  const embedded=html.match(/id="report-image-data">([\s\S]*?)<\/script>/)[1];
  assert(!embedded.includes('<script>'));assert.equal(JSON.parse(embedded).title,r.hardware.model);
});

test('unknown states remain unknown and Activation Lock on requests removal before sale',()=>{
  const r=base();r.activationLock='unknown';r.enrollment={};r.queryErrors=['hardware_query_failed'];
  const view=reportView(r);
  assert(view.checks.every(c=>c.tone==='unknown'));
  assert.equal(view.incomplete,true);
  r.activationLock='enabled';
  assert.equal(reportView(r).checks[2].text,'On · remove before sale');
  assert.equal(reportView(r).checks[2].tone,'attention');
});

test('sample report is visibly marked as synthetic',()=>{
  const html=renderReportDocument(base(),{sample:true});
  assert.match(html,/SYNTHETIC SAMPLE · NOT A REAL DEVICE/);
  assert.equal(JSON.parse(html.match(/id="report-image-data">([\s\S]*?)<\/script>/)[1]).sample,true);
});
