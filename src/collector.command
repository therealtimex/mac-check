#!/bin/zsh
# Mac Check v2 — inspect this file before running it.
# Generated from src/collector.command and dist/report-page.js by npm run build.
# Uses built-in macOS tools. No sudo, installation, network requests, profile
# changes or erasure. Saves local JSON and HTML reports, then opens the HTML.
# Never uploads a report.
# The report includes only the LAST FOUR characters of the serial number.
set -eu
umask 077
if [[ "$(/usr/bin/uname -s)" != "Darwin" ]]; then
  print -u2 'Mac Check runs on macOS only.'
  exit 1
fi
MACCHECK_CODE="${1:-}"
if [[ -z "$MACCHECK_CODE" ]]; then
  MACCHECK_CODE="MC-$(/usr/bin/uuidgen | /usr/bin/cut -c1-8)"
fi
if [[ ! "$MACCHECK_CODE" =~ '^[A-Za-z0-9-]{4,40}$' ]]; then
  print -u2 'Use a 4–40 character report code containing letters, numbers and hyphens.'
  exit 1
fi
printf '\nMac Check\nReads specs and enrollment. No password, changes or uploads.\nOnly the last four serial characters appear.\n'
if [[ -t 0 ]]; then
  printf '\nPress Return to check this Mac, or Control-C to cancel: '
  read -r MACCHECK_CONFIRM
fi
printf '\nChecking this Mac…\n'
MACCHECK_TMP="$(/usr/bin/mktemp -t mac-check)"
trap '/bin/rm -f "$MACCHECK_TMP"' EXIT HUP INT TERM
/usr/bin/osascript -l JavaScript - "$MACCHECK_CODE" <<'MACCHECK_JXA' > "$MACCHECK_TMP"
function run(argv) {
  var app=Application.currentApplication();
  app.includeStandardAdditions=true;
  var errors=[];
  function command(text,key) { try { return app.doShellScript(text); } catch(e) { errors.push(key); return ''; } }
  function json(text) { try { return JSON.parse(text); } catch(e) { return {}; } }
  function enrollment(text,label) { var re=new RegExp('^'+label+':\\s*(Yes|No)\\b','mi'); var match=text.match(re); return match ? match[1].toLowerCase() : 'unknown'; }
  var hardware=json(command('/usr/bin/env LC_ALL=C LANG=C /usr/sbin/system_profiler SPHardwareDataType -json','hardware_query_failed'));
  var h=(hardware.SPHardwareDataType || [])[0] || {};
  var rawMemory=String(h.physical_memory || '');
  var memory=rawMemory.match(/^([0-9.]+)\s*(GB|TB)\b/i);
  var memoryGB=memory ? Number(memory[1])*(memory[2].toUpperCase()==='TB' ? 1024 : 1) : null;
  var serial=String(h.serial_number || '');
  var activation=String(h.activation_lock_status || '').toLowerCase();
  var activationState=/disabled/.test(activation) ? 'disabled' : /enabled/.test(activation) ? 'enabled' : 'unknown';
  var enrolled=command('/usr/bin/env LC_ALL=C LANG=C /usr/bin/profiles status -type enrollment','enrollment_query_failed');
  var list=command('/usr/sbin/diskutil list -plist internal physical | /usr/bin/plutil -convert json -o - -','storage_list_failed');
  var storage=[];
  (json(list).AllDisksAndPartitions || []).forEach(function(d) {
    var id=String(d.DeviceIdentifier || '');
    if (!/^disk[0-9]+$/.test(id)) return;
    var info=json(command('/usr/sbin/diskutil info -plist '+id+' | /usr/bin/plutil -convert json -o - -','storage_info_failed'));
    if (info.Internal !== true) return;
    var size=Number(info.TotalSize || d.Size);
    storage.push({device:id,sizeBytes:isFinite(size) && size>0 ? size : null,solidState:typeof info.SolidState==='boolean' ? info.SolidState : null});
  });
  return JSON.stringify({schema:'mac-check/v1',evidence:'Seller-generated local report; not independently attested.',collectedAt:new Date().toISOString(),challenge:String(argv[0] || '').toUpperCase(),hardware:{model:String(h.machine_name || ''),modelIdentifier:String(h.machine_model || ''),chip:String(h.chip_type || h.cpu_type || ''),memoryGB:memoryGB,serialEnding:/[a-zA-Z0-9]{4}$/.test(serial) ? serial.slice(-4).toUpperCase() : ''},macOS:command('/usr/bin/sw_vers -productVersion','os_version_failed'),activationLock:activationState,enrollment:{automated:enrollment(enrolled,'Enrolled via DEP'),mdm:enrollment(enrolled,'MDM enrollment')},storage:storage,queryErrors:errors},null,2);
}
MACCHECK_JXA
if [[ -n "${MACCHECK_OUTPUT_DIR:-}" ]]; then
  if [[ ! -d "$MACCHECK_OUTPUT_DIR" ]]; then
    print -u2 'MACCHECK_OUTPUT_DIR must name an existing directory.'
    exit 1
  fi
elif [[ -d "$HOME/Downloads" ]]; then
  MACCHECK_OUTPUT_DIR="$HOME/Downloads"
else
  MACCHECK_OUTPUT_DIR="$HOME"
fi
MACCHECK_STAMP="$(/bin/date -u +%Y%m%dT%H%M%SZ)"
MACCHECK_SUFFIX="${MACCHECK_TMP##*.}"
MACCHECK_OUTPUT="$MACCHECK_OUTPUT_DIR/mac-check-report-$MACCHECK_STAMP-$MACCHECK_SUFFIX.json"
if [[ -e "$MACCHECK_OUTPUT" ]]; then
  print -u2 'The output file already exists; no report was overwritten.'
  exit 1
fi
/bin/cat "$MACCHECK_TMP" > "$MACCHECK_OUTPUT"
MACCHECK_HTML="${MACCHECK_OUTPUT%.json}.html"
/usr/bin/osascript -l JavaScript - "$MACCHECK_OUTPUT" "$MACCHECK_HTML" <<'MACCHECK_REPORT'
# @REPORT_RENDERER@
function run(argv) {
  ObjC.import('Foundation');
  var raw=$.NSString.stringWithContentsOfFileEncodingError($(argv[0]),$.NSUTF8StringEncoding,null);
  if (!raw) throw new Error('Could not read the local report.');
  var html=renderReportDocument(JSON.parse(ObjC.unwrap(raw)));
  var written=$(html).writeToFileAtomicallyEncodingError($(argv[1]),true,$.NSUTF8StringEncoding,null);
  if (!written) throw new Error('Could not save the report page.');
  return '';
}
MACCHECK_REPORT
printf '\nDone. Your report is ready:\n%s\n\nSave or copy its screenshot and send it to your buyer.\nNo report was uploaded.\n' "$MACCHECK_HTML"
printf '\nJSON copy: %s\n' "$MACCHECK_OUTPUT"
if [[ "${MACCHECK_OPEN_REPORT:-1}" != "0" ]]; then
  if ! /usr/bin/open "$MACCHECK_HTML"; then
    printf '\nOpen the HTML file above to view your report.\n'
  fi
fi
