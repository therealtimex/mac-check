import { MAX_REPORT_BYTES, normalizeReport } from './report.js';
import { renderReportDocument } from './report-page.js';
const $=id=>document.getElementById(id);
$('download').addEventListener('click',()=>{$('next').hidden=false;});
$('copy-command').addEventListener('click',async()=>{try{await navigator.clipboard.writeText("zsh ~/Downloads/'Mac Check.command'");$('copy-status').textContent='Copied. Paste it in Terminal and press Return.';}catch{$('copy-status').textContent='Select and copy the command above.';}});
let reportURL=null;
$('legacy-file').addEventListener('change',async event=>{
  $('legacy-open').hidden=true;$('legacy-status').textContent='';
  if(reportURL){URL.revokeObjectURL(reportURL);reportURL=null;}
  const file=event.target.files[0];if(!file)return;
  try{
    if(file.size>MAX_REPORT_BYTES)throw new Error('Choose a report smaller than 1 MB.');
    const report=normalizeReport(JSON.parse(await file.text()));
    reportURL=URL.createObjectURL(new Blob([renderReportDocument(report)],{type:'text/html'}));
    $('legacy-open').href=reportURL;$('legacy-open').hidden=false;
    $('legacy-status').textContent='Ready. This report stays in your browser.';
  }catch(error){$('legacy-status').textContent=error instanceof SyntaxError?'Choose a valid Mac Check JSON report.':error.message;}
});
