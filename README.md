# Mac Check

A small Mac checker that produces a screenshot-ready local report.

Website: https://therealtimex.github.io/mac-check/

## Seller flow

1. Download the checker from the website and save it in Downloads.
2. Click **Copy command**, open Terminal, paste the command and press Return.
3. The checker opens a local HTML report automatically.
4. Save or copy its screenshot and send it in the existing buyer conversation.

The visible command runs the exact downloaded, fingerprinted script using `zsh`. If clipboard access is blocked, the page selects the command for manual copying. If the file is saved elsewhere, type `zsh ` in Terminal, drag the file into the window, append ` --run`, and press Return.

This is an unsigned shell script. Finder can block a browser-downloaded copy with a Gatekeeper warning; preserving an executable bit in a ZIP does not establish developer trust. The supported flow uses an explicit Terminal command and does not remove quarantine or change security settings. A website cannot automatically launch Terminal. A smoother Finder launch requires a Developer ID signed, notarized app, which is not included in this release.

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

- `src/collector.command` is the shell source; `src/index.html` is the landing template.
- `dist/report-page.js` renders both browser previews and the self-contained local report.
- `scripts/build.mjs` bundles the renderer into the stable collector and a content-fingerprinted download, fills the landing template and `launch.json`, and creates the legacy ZIP and sample report. It uses Node built-ins only.
- `dist/` is the complete static website.

Build after editing the collector source or report renderer. Generated distribution files are committed so the public download can be inspected directly.

For local automation, `MACCHECK_OUTPUT_DIR` may specify an existing output directory; `MACCHECK_OPEN_REPORT=0` suppresses browser opening. The website command passes `--run`, so pressing Return in Terminal starts the check without another prompt. Direct interactive invocation without this flag pauses for confirmation. Noninteractive runs proceed directly.

## Verification

Unit tests cover unknown status, redaction, physical storage, safe HTML/JSON embedding, offline report rendering and the match between the download hash and visible launch command. macOS integration tests add a quarantine attribute to temporary copies of the raw download and legacy ZIP checker, then run them explicitly through `zsh` inside a pseudo-terminal. They verify no extra Return prompt, retained quarantine, private JSON and HTML, and both automatic and supplied report IDs. Temporary integration reports are deleted and never uploaded. These tests do not certify Finder or Gatekeeper trust.

GitHub Pages deployment requires the macOS test job to pass. The static deployment job runs the same build and tests on Linux, where the two macOS integration tests are skipped.

## Hosting

The public page is deployed from `dist/` by `.github/workflows/pages.yml` on pushes to `main`. For a fork, enable **Settings → Pages → Source → GitHub Actions**, then run the deployment workflow.

No device reports, credentials, private hosting metadata or buyer conversations belong in this repository.

Primary references: https://support.apple.com/102541, https://support.apple.com/102773 and https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution .
