import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

test('launch command names the exact fingerprinted download',()=>{
  const config=JSON.parse(readFileSync(new URL('../dist/launch.json',import.meta.url),'utf8'));
  const script=readFileSync(new URL('../dist/'+config.fileName,import.meta.url));
  const hash=createHash('sha256').update(script).digest('hex');
  assert.equal(config.sha256,hash);
  assert.equal(config.fileName,'mac-check-'+hash.slice(0,12)+'.command');
  assert.equal(config.runCommand,'zsh ~/Downloads/'+config.fileName+' --run');
  const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
  assert.ok(html.includes('download="'+config.fileName+'"'));
  assert.ok(html.includes('value="'+config.runCommand+'"'));
  assert.ok(!html.includes('double-click'));
  assert.ok(html.includes('unsigned shell script'));
});
