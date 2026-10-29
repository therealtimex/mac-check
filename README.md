# Mac Check

A small Mac checker that produces a screenshot-ready local report.

Website: https://therealtimex.github.io/mac-check/

## Seller flow

1. Download and unzip `mac-check.zip`.
2. Open `Mac Check.command`. Terminal opens; press Return.
3. The checker opens a local HTML report automatically.
4. Save or copy its screenshot and send it in the existing buyer conversation.

A website cannot automatically launch Terminal after a download. The user must open the downloaded checker, and macOS may ask for confirmation. The ZIP preserves the executable bit. An alternative Terminal command is available under “Need another way?” on the page.

No check code or JSON import is required. The checker creates a report ID automatically. Existing code arguments remain supported, and older JSON reports can still be opened through the page’s secondary controls.

## Data and trust

The checker runs built-in read-only macOS queries for hardware, physical internal storage, local enrollment and Activation Lock. It requests no administrator password, installs nothing, makes no network requests, and never erases or changes enrollment. It saves private JSON and self-contained HTML files in Downloads; only the last four serial characters appear.

The HTML report uses embedded styles and scripts, so it opens without contacting a server. Screenshot creation happens in the browser. Copying images depends on browser clipboard permissions; saving a PNG or taking an ordinary screenshot is the fallback.

Reports are seller generated and can be edited. They do not certify ownership, organization release, absence of a bypass or successful post-reset online setup. Missing or failed queries remain unknown. Activation Lock being on can be normal on an owned Mac with Find My enabled; it needs attention before a sale.

## Develop

Requires Node.js 22 or newer for development. End users need only built-in macOS tools.

```sh
npm run build
npm test
npm run preview
```

- `src/collector.command` is the shell source.
- `dist/report-page.js` renders both browser previews and the self-contained local report.
- `scripts/build.mjs` bundles the renderer into `dist/mac-check.command`, creates the executable ZIP and generates the sample report. It uses Node built-ins only.
- `dist/` is the complete static website.

Build after editing the collector source or report renderer. Generated distribution files are committed so the public download can be inspected directly.

For local automation, `MACCHECK_OUTPUT_DIR` may specify an existing output directory; `MACCHECK_OPEN_REPORT=0` suppresses browser opening. The default interactive flow pauses for Return. Noninteractive runs proceed directly.

## Verification

Unit tests cover unknown status, redaction, physical storage, safe HTML/JSON embedding and offline report rendering. macOS integration tests unpack the actual ZIP, check its executable permissions, run it both with and without a code, and verify the generated JSON and HTML plus private file permissions. Temporary integration reports are deleted and never uploaded.

GitHub Pages deployment requires the macOS test job to pass. The static deployment job runs the same build and tests on Linux, where the two macOS integration tests are skipped.

## Hosting

The public page is deployed from `dist/` by `.github/workflows/pages.yml` on pushes to `main`. For a fork, enable **Settings → Pages → Source → GitHub Actions**, then run the deployment workflow.

No device reports, credentials, private hosting metadata or buyer conversations belong in this repository.

Primary references: https://support.apple.com/102541 and https://support.apple.com/102773 .
