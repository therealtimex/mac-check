import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { normalizeReport, assess, freshness } from '../dist/report.js';
const shell=readFileSync(new URL('../dist/mac-check.command',import.meta.url),'utf8');
const collector=shell.split("<<'MACCHECK_JXA' > \"$MACCHECK_TMP\"\n")[1].split('\nMACCHECK_JXA')[0];
function collect({hardware={},enrollment='',diskInfo={Internal:true,SolidState:true,TotalSize:500277790720},fail=[]}={}) {
 const calls=[];
 const app={doShellScript(command){calls.push(command);if(fail.some(s=>command.includes(s)))throw new Error('simulated unavailable');if(command.includes('system_profiler'))return JSON.stringify({SPHardwareDataType:[hardware]});if(command.includes('profiles status'))return enrollment;if(command.includes('diskutil list'))return JSON.stringify({AllDisksAndPartitions:[{DeviceIdentifier:'disk0',Size:500277790720}]});if(command.includes('diskutil info'))return JSON.stringify(diskInfo);if(command.includes('sw_vers'))return '26.1';throw new Error('Unrecognized command');}};
 const context=vm.createContext({Application:{currentApplication:()=>app},Date,JSON});vm.runInContext(collector,context);
 return {report:JSON.parse(context.run(['MC-TEST1234'])),calls};
}
test('collector strips full serial and private hardware identifiers',()=>{
 const {report}=collect({hardware:{machine_name:'Mac mini',machine_model:'Mac16,10',chip_type:'Apple M4',physical_memory:'32 GB',serial_number:'PRIVATE1234',platform_UUID:'DO-NOT-SHARE',activation_lock_status:'activation_lock_disabled'},enrollment:'Enrolled via DEP: No\nMDM enrollment: No'});
 assert.equal(report.hardware.serialEnding,'1234');assert.equal(report.hardware.memoryGB,32);assert.equal(report.activationLock,'disabled');assert.equal(report.enrollment.mdm,'no');assert(!JSON.stringify(report).includes('PRIVATE'));assert(!JSON.stringify(report).includes('DO-NOT-SHARE'));
});
test('query failure remains unknown and is never assessed as clear',()=>{
 const {report}=collect({fail:['system_profiler','profiles status','diskutil list']});
 const r=normalizeReport(report);assert.equal(r.activationLock,'unknown');assert.equal(r.enrollment.mdm,'unknown');assert.equal(r.hardware.memoryGB,null);assert(assess(r).every(c=>c.kind==='unknown'));assert.equal(r.queryErrors.length,3);
});
test('enrolled, enabled and insufficient hardware become review issues',()=>{
 const {report}=collect({hardware:{physical_memory:'16 GB',activation_lock_status:'activation_lock_enabled'},enrollment:'Enrolled via DEP: Yes\nMDM enrollment: Yes (User Approved)',diskInfo:{Internal:true,SolidState:true,TotalSize:251000000000}});
 assert.equal(assess(normalizeReport(report)).filter(c=>c.kind==='blocked').length,5);
});
test('only a physical internal SSD can meet capacity target',()=>{
 const r=normalizeReport({schema:'mac-check/v1',storage:[{device:'disk0',sizeBytes:1000000000000,solidState:false},{device:'disk3',sizeBytes:251000000000,solidState:true},{device:'disk4',sizeBytes:251000000000,solidState:true}]});
 assert.equal(assess(r)[1].kind,'blocked');
 const {report}=collect({diskInfo:{Internal:false,SolidState:true,TotalSize:1000000000000}});assert.equal(report.storage.length,0);
});
test('import normalizes unknown states and discards arbitrary private fields',()=>{
 const r=normalizeReport({schema:'mac-check/v1',hardware:{memoryGB:'32',serialEnding:'<script>',serial:'PRIVATE'},activationLock:'off',enrollment:{mdm:'false'},storage:[{device:'disk0;rm',sizeBytes:Infinity,solidState:'true'}],appleAccount:'PRIVATE'});
 assert.equal(r.hardware.memoryGB,null);assert.equal(r.hardware.serialEnding,'');assert.equal(r.enrollment.mdm,'unknown');assert.equal(r.activationLock,'unknown');assert.equal(r.storage[0].device,'');assert(!JSON.stringify(r).includes('PRIVATE'));assert.throws(()=>normalizeReport([]));assert.throws(()=>normalizeReport({schema:'other'}));
});
test('stale and future reports are identified without certifying fresh reports',()=>{
 const now=Date.now();assert.match(freshness({collectedAt:new Date(now-172800000).toISOString()},now),/24 hours/);assert.match(freshness({collectedAt:new Date(now+600000).toISOString()},now),/future/);assert.match(freshness({collectedAt:'bad'},now),/invalid/);assert.equal(freshness({collectedAt:new Date(now).toISOString()},now),'');
});
test('collector commands contain no enrollment mutation, network requests or privilege escalation',()=>{
 const {calls}=collect();assert(!calls.some(c=>/\bsudo\b|\bcurl\b|\bwget\b|profiles\s+(renew|install|remove)|eraseDisk|eraseVolume/.test(c)));assert(calls.some(c=>c.includes('profiles status -type enrollment')));
});
