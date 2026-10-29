import { normalizeReport } from './report.js';

function escapeHTML(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

export function reportView(input) {
  var r = normalizeReport(input);
  var size = Math.max(0, ...r.storage.map(function(d) { return d.sizeBytes || 0; }));
  var storage = !size ? 'Unknown' : size >= 950e9 ? (size / 1e12).toFixed(size >= 1e12 ? 1 : 2).replace(/\.0$/, '') + ' TB' : (size / 1e9).toFixed(0) + ' GB';
  var status = function(value) {
    return value === 'no' ? { text: 'Not enrolled', tone: 'clear' } :
      value === 'yes' ? { text: 'Enrolled', tone: 'issue' } :
      { text: 'Unknown', tone: 'unknown' };
  };
  var mdm = status(r.enrollment.mdm);
  var dep = status(r.enrollment.automated);
  var lock = r.activationLock === 'disabled' ? { text: 'Off', tone: 'clear' } :
    r.activationLock === 'enabled' ? { text: 'On · remove before sale', tone: 'attention' } :
    { text: 'Unknown', tone: 'unknown' };
  return {
    report: r,
    title: r.hardware.model || r.hardware.modelIdentifier || 'Mac report',
    specs: [
      { label: 'Chip', value: r.hardware.chip || 'Unknown' },
      { label: 'Memory', value: r.hardware.memoryGB ? r.hardware.memoryGB + ' GB' : 'Unknown' },
      { label: 'Storage', value: storage },
      { label: 'macOS', value: r.macOS || 'Unknown' }
    ],
    checks: [
      { label: 'MDM enrollment', text: mdm.text, tone: mdm.tone },
      { label: 'Automated enrollment / DEP', text: dep.text, tone: dep.tone },
      { label: 'Activation Lock', text: lock.text, tone: lock.tone }
    ],
    collected: r.collectedAt ? r.collectedAt.replace('T', ' ').replace(/\.\d+Z$/, ' UTC').replace(/Z$/, ' UTC') : 'Unknown',
    serial: r.hardware.serialEnding || 'Unknown',
    id: r.challenge || 'Not provided',
    incomplete: r.queryErrors.length > 0
  };
}

// Included verbatim in the local HTML report; it makes no network requests.
function screenshotControls() {
  var view = JSON.parse(document.getElementById('report-image-data').textContent);
  var status = document.getElementById('share-status');
  function rounded(ctx,x,y,w,h,r,color) {
    ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.fill();
  }
  function label(ctx,text,x,y,size,color,weight) {
    ctx.fillStyle=color;ctx.font=(weight || 400)+' '+size+'px system-ui, sans-serif';ctx.fillText(String(text),x,y);
  }
  function fit(ctx,text,maxWidth) {
    var value=String(text);
    while(value.length>1 && ctx.measureText(value).width>maxWidth) value=value.slice(0,-1);
    return value===String(text) ? value : value.slice(0,-1)+'…';
  }
  function imageBlob() {
    return new Promise(function(resolve,reject) {
      try {
        var c=document.createElement('canvas');c.width=1600;c.height=1200;
        var x=c.getContext('2d');x.scale(2,2);
        x.fillStyle='#f4f6f1';x.fillRect(0,0,800,600);
        rounded(x,24,24,752,552,18,'#ffffff');
        label(x,'M✓  MAC CHECK',52,65,14,'#27644f',700);
        label(x,view.sample ? 'SAMPLE · NOT A REAL DEVICE' : 'LOCAL DEVICE REPORT',52,92,10,'#6b7d70',600);
        x.font='600 32px system-ui, sans-serif';
        label(x,fit(x,view.title,690),52,137,32,'#23372d',600);
        label(x,'Collected '+view.collected,52,169,11,'#6d7d72');
        var colors={clear:'#276c50',issue:'#a63e32',attention:'#95641d',unknown:'#7a7666'};
        view.specs.forEach(function(s,i) {
          var left=52+i*177;
          rounded(x,left,194,165,88,9,'#f2f5ed');
          label(x,s.label,left+13,219,10,'#6b7d70');
          x.font='600 18px system-ui, sans-serif';
          label(x,fit(x,s.value,139),left+13,250,18,'#253e30',600);
        });
        view.checks.forEach(function(s,i) {
          var top=324+i*49;
          label(x,s.label,52,top,13,'#455b4c');
          x.font='600 13px system-ui, sans-serif';
          var text=fit(x,s.text,320);
          var width=x.measureText(text).width;
          label(x,text,748-width,top,13,colors[s.tone],600);
          x.strokeStyle='#e5eade';x.beginPath();x.moveTo(52,top+18);x.lineTo(748,top+18);x.stroke();
        });
        label(x,'Serial ending: '+view.serial+'     Report ID: '+view.id,52,487,11,'#6d7d72');
        if(view.incomplete) label(x,'Some checks could not finish. Unknown values need review.',52,513,11,'#95641d');
        label(x,'Seller-generated evidence. Reset / online setup not tested.',52,view.incomplete?538:518,11,'#6d7d72');
        if(view.sample) label(x,'SYNTHETIC SAMPLE',52,557,11,'#95641d',700);
        c.toBlob(function(blob) { if(blob)resolve(blob);else reject(new Error('Could not create the image.')); },'image/png');
      } catch(error) { reject(error); }
    });
  }
  window.macCheckScreenshotBlob=imageBlob;
  function download(blob) {
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download='Mac-Check-'+view.serial+'.png';a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href);},1000);
  }
  document.getElementById('save-screenshot').addEventListener('click',function() {
    imageBlob().then(function(blob){download(blob);status.textContent='Screenshot saved. Send it to your buyer.';})
      .catch(function(){status.textContent='Press Shift–Command–4 and capture the report card below.';});
  });
  var copy=document.getElementById('copy-screenshot');
  if(!navigator.clipboard || typeof ClipboardItem==='undefined') copy.hidden=true;
  else {
    if(navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({name:'clipboard-write'}).then(function(permission) {
        function update() { copy.hidden=permission.state==='denied'; }
        update();permission.onchange=update;
      }).catch(function(){});
    }
    copy.addEventListener('click',function() {
    var item=new ClipboardItem({'image/png':imageBlob()});
    navigator.clipboard.write([item]).then(function(){status.textContent='Screenshot copied. Paste it into your conversation.';})
      .catch(function(){status.textContent='Use Save screenshot, or press Shift–Command–4 to capture the card.';});
    });
  }
  if(view.sample) {
    document.getElementById('save-screenshot').disabled=true;
    copy.disabled=true;
    status.textContent='Example only. Run the download to get a report for your Mac.';
  }
}

export function renderReportDocument(input, options) {
  var view=reportView(input);view.sample=!!(options && options.sample);
  var specHTML=view.specs.map(function(s){return '<div class="spec"><span>'+escapeHTML(s.label)+'</span><strong>'+escapeHTML(s.value)+'</strong></div>';}).join('');
  var checksHTML=view.checks.map(function(s){return '<div class="check"><span>'+escapeHTML(s.label)+'</span><strong class="'+s.tone+'">'+escapeHTML(s.text)+'</strong></div>';}).join('');
  var data=JSON.stringify(view).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Mac Check — '+escapeHTML(view.title)+'</title><style>'+
    '*{box-sizing:border-box}body{margin:0;background:#f4f6f1;color:#24392d;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.5}main{max-width:840px;padding:30px 24px 22px;margin:auto}.toolbar{display:flex;align-items:center;gap:9px;margin-bottom:16px}.toolbar a{margin-right:auto;color:#27644f;font-size:14px;text-decoration:none;font-weight:700}button{padding:11px 15px;border-radius:8px;border:1px solid #d6e2d1;background:#fff;font-size:12px;font-weight:600;color:#315c42;cursor:pointer}button.primary{background:#27644f;color:#fff;border-color:#27644f}button:disabled{opacity:.45;cursor:default}[hidden]{display:none!important}#report-card{padding:30px;background:white;border:1px solid #dfe7d8;border-radius:17px}.eyebrow{font-size:10px;letter-spacing:1.6px;color:#5e7c66;margin:0 0 8px;font-weight:650}h1{font-size:32px;letter-spacing:-1.1px;margin:0 0 8px;overflow-wrap:anywhere;font-weight:650}.date{font-size:11px;color:#718372;margin:0 0 23px}.specs{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.spec{background:#f2f5ed;padding:15px 13px;border-radius:8px;min-width:0}.spec span{display:block;font-size:10px;color:#718372}.spec strong{display:block;font-size:18px;margin-top:8px;font-weight:600;overflow-wrap:anywhere}.checks{margin-top:23px}.check{display:flex;justify-content:space-between;align-items:center;gap:15px;padding:15px 0;border-bottom:1px solid #e4eadf;font-size:12px}.check>span{color:#526653}.check strong{font-weight:600;text-align:right}.clear{color:#276c50}.issue{color:#a63e32}.attention{color:#95641d}.unknown{color:#7a7666}.meta{display:flex;gap:20px;flex-wrap:wrap;color:#718372;font-size:10px;margin:23px 0 11px}.limits{color:#718372;font-size:10px;margin:0}.incomplete{color:#95641d;font-size:11px}.status{font-size:12px;text-align:center;color:#627965;margin:14px 0 5px;min-height:20px}.help{font-size:11px;text-align:center;color:#7b8a78;margin:5px 0}.sample{color:#95641d}.footer{display:flex;justify-content:center;gap:20px;margin:20px;font-size:11px}.footer a{color:#718372}@media(max-width:570px){main{padding:16px 12px}.toolbar{flex-wrap:wrap}.toolbar a{width:100%;margin-bottom:5px}#report-card{padding:23px 19px}h1{font-size:27px}.specs{grid-template-columns:repeat(2,1fr)}.check{font-size:11px}.meta{gap:6px;flex-direction:column}}@media print{.toolbar,.status,.help,.footer{display:none}body{background:#fff}main{padding:0}#report-card{border:0}}'+
    '</style></head><body><main><div class="toolbar"><a href="https://therealtimex.github.io/mac-check/">M✓ Mac Check</a><button class="primary" id="save-screenshot">Save screenshot ↓</button><button id="copy-screenshot">Copy screenshot</button></div><article id="report-card"><p class="eyebrow '+(view.sample?'sample':'')+'">'+(view.sample?'SYNTHETIC SAMPLE · NOT A REAL DEVICE':'LOCAL DEVICE REPORT')+'</p><h1>'+escapeHTML(view.title)+'</h1><p class="date">Collected '+escapeHTML(view.collected)+'</p><div class="specs">'+specHTML+'</div><div class="checks">'+checksHTML+'</div><div class="meta"><span>Serial ending: '+escapeHTML(view.serial)+'</span><span>Report ID: '+escapeHTML(view.id)+'</span></div>'+(view.incomplete?'<p class="incomplete">Some checks could not finish. Unknown values need review.</p>':'')+'<p class="limits">Seller-generated evidence. Reset / online setup not tested.</p></article><p class="status" id="share-status">Save or copy the screenshot, then send it in your conversation.</p><p class="help">You can also press Shift–Command–4 and select the report card.</p><div class="footer"><a href="https://github.com/therealtimex/mac-check">Source code</a><a href="https://support.apple.com/102541">About Activation Lock</a></div></main><script type="application/json" id="report-image-data">'+data+'</script><script>('+screenshotControls.toString()+')();</script></body></html>';
}
