export const MAX_REPORT_BYTES = 1024 * 1024;
const clean = (v, max = 150) => typeof v === 'string' ? v.slice(0, max) : '';
const state = v => ['yes', 'no', 'unknown'].includes(v) ? v : 'unknown';
const positiveNumber = v => typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null;
export function normalizeReport(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || input.schema !== 'mac-check/v1') throw new Error('Choose a Mac Check v1 JSON report.');
  const h = input.hardware && typeof input.hardware === 'object' ? input.hardware : {};
  const e = input.enrollment && typeof input.enrollment === 'object' ? input.enrollment : {};
  const disks = Array.isArray(input.storage) ? input.storage.slice(0, 12) : [];
  return {
    schema: 'mac-check/v1',
    evidence: 'Seller-generated local report; not independently attested.',
    collectedAt: clean(input.collectedAt, 50),
    challenge: clean(input.challenge, 40),
    hardware: { model: clean(h.model), modelIdentifier: clean(h.modelIdentifier), chip: clean(h.chip), memoryGB: positiveNumber(h.memoryGB), serialEnding: /^[a-zA-Z0-9]{4}$/.test(h.serialEnding || '') ? h.serialEnding.toUpperCase() : '' },
    macOS: clean(input.macOS, 30),
    activationLock: ['enabled', 'disabled', 'unknown'].includes(input.activationLock) ? input.activationLock : 'unknown',
    enrollment: { automated: state(e.automated), mdm: state(e.mdm) },
    storage: disks.map(d => ({ device: /^disk\d+$/.test(d?.device || '') ? d.device : '', sizeBytes: positiveNumber(d?.sizeBytes), solidState: typeof d?.solidState === 'boolean' ? d.solidState : null })),
    queryErrors: Array.isArray(input.queryErrors) ? input.queryErrors.filter(x => typeof x === 'string' && /^[a-z_]+$/.test(x)).slice(0, 12) : []
  };
}
export function assess(report) {
  const largest = Math.max(0, ...report.storage.filter(d => d.solidState === true).map(d => d.sizeBytes || 0));
  return [
    { label: 'Memory · 24 GB minimum', kind: report.hardware.memoryGB == null ? 'unknown' : report.hardware.memoryGB >= 24 ? 'clear' : 'blocked', text: report.hardware.memoryGB == null ? 'Not reported' : report.hardware.memoryGB >= 24 ? 'Meets memory target' : 'Below memory target' },
    { label: 'Internal SSD · 512 GB class minimum', kind: !largest ? 'unknown' : largest >= 480e9 ? 'clear' : 'blocked', text: !largest ? 'SSD capacity not confirmed' : largest >= 480e9 ? 'Meets capacity target' : 'Below capacity target' },
    { label: 'Local MDM enrollment', kind: report.enrollment.mdm === 'no' ? 'clear' : report.enrollment.mdm === 'yes' ? 'blocked' : 'unknown', text: report.enrollment.mdm === 'no' ? 'Reported not enrolled' : report.enrollment.mdm === 'yes' ? 'Reported enrolled' : 'Unknown' },
    { label: 'Automated enrollment / DEP', kind: report.enrollment.automated === 'no' ? 'clear' : report.enrollment.automated === 'yes' ? 'blocked' : 'unknown', text: report.enrollment.automated === 'no' ? 'Reported not enrolled' : report.enrollment.automated === 'yes' ? 'Reported enrolled' : 'Unknown' },
    { label: 'Activation Lock', kind: report.activationLock === 'disabled' ? 'clear' : report.activationLock === 'enabled' ? 'blocked' : 'unknown', text: report.activationLock === 'disabled' ? 'Reported disabled' : report.activationLock === 'enabled' ? 'Reported enabled' : 'Not reported · check separately' },
    { label: 'Reset + online setup', kind: 'unknown', text: 'Not tested by this report' }
  ];
}
export function freshness(report, now = Date.now()) {
  const timestamp = Date.parse(report.collectedAt);
  if (!Number.isFinite(timestamp)) return 'Collection time is missing or invalid.';
  if (timestamp > now + 5 * 60 * 1000) return 'Report time is in the future. Check the Mac’s clock and the report.';
  if (now - timestamp > 24 * 60 * 60 * 1000) return 'This report is more than 24 hours old. Ask for a fresh check if needed.';
  return '';
}
