import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { renderReportDocument } from '../dist/report-page.js';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const source=readFileSync(resolve(root,'src/collector.command'),'utf8');
const report=readFileSync(resolve(root,'dist/report.js'),'utf8').replace(/^export /gm,'');
const renderer=readFileSync(resolve(root,'dist/report-page.js'),'utf8').replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
if(source.split('# @REPORT_RENDERER@').length!==2) throw new Error('Expected one renderer marker.');
const command=source.replace('# @REPORT_RENDERER@',report+'\n'+renderer);
writeFileSync(resolve(root,'dist/mac-check.command'),command);chmodSync(resolve(root,'dist/mac-check.command'),0o755);
const digest=createHash('sha256').update(command).digest('hex');
const fileName='mac-check-'+digest.slice(0,12)+'.command';
writeFileSync(resolve(root,'dist',fileName),command);
const runCommand='zsh ~/Downloads/'+fileName+' --run';
writeFileSync(resolve(root,'dist/launch.json'),JSON.stringify({fileName,runCommand,sha256:digest},null,2)+'\n');
const landing=readFileSync(resolve(root,'src/index.html'),'utf8').replaceAll('__COLLECTOR_NAME__',fileName);
writeFileSync(resolve(root,'dist/index.html'),landing);

function crc32(buffer){var crc=0xffffffff;for(var i=0;i<buffer.length;i++){crc^=buffer[i];for(var b=0;b<8;b++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
const name=Buffer.from('Mac Check.command');const data=Buffer.from(command);const crc=crc32(data);
const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(0x800,6);local.writeUInt16LE(0x21,12);local.writeUInt32LE(crc,14);local.writeUInt32LE(data.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(name.length,26);
const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(0x314,4);central.writeUInt16LE(20,6);central.writeUInt16LE(0x800,8);central.writeUInt16LE(0x21,14);central.writeUInt32LE(crc,16);central.writeUInt32LE(data.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(name.length,28);central.writeUInt32LE((0o100755<<16)>>>0,38);
const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(central.length+name.length,12);end.writeUInt32LE(local.length+name.length+data.length,16);
writeFileSync(resolve(root,'dist/mac-check.zip'),Buffer.concat([local,name,data,central,name,end]));
writeFileSync(resolve(root,'dist/example.html'),renderReportDocument({schema:'mac-check/v1',collectedAt:'2026-10-28T20:30:00Z',challenge:'SAMPLE-ONLY',hardware:{model:'Mac mini',modelIdentifier:'Mac16,10',chip:'Apple M4',memoryGB:32,serialEnding:'DEMO'},macOS:'26.1',activationLock:'disabled',enrollment:{automated:'no',mdm:'no'},storage:[{device:'disk0',sizeBytes:500277790720,solidState:true}],queryErrors:[]},{sample:true}));
console.log('Built executable ZIP, standalone collector and sample report.');
