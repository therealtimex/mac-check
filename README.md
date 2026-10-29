# Mac Check

A dependency-free static seller check page plus a readable macOS collector.

Website: https://therealtimex.github.io/mac-check/

The collector runs built-in read-only system queries and writes one private JSON file to Downloads. It never uploads, installs, erases, requests administrator credentials or changes enrollment. Only a four-character serial ending is retained. The browser normalizes imported fields before export and has no report-upload endpoint, analytics or external scripts.

## Run

`npm test`

`npm run preview` serves `http://127.0.0.1:8785`.

Download `dist/mac-check.command`, inspect it, and run `zsh ~/Downloads/mac-check.command MC-EXAMPLE` on the seller's Mac. Load the generated JSON through the page. The collector requires only built-in macOS `zsh`, `osascript`, `system_profiler`, `profiles`, `diskutil`, `plutil` and `sw_vers`.

## Trust and limits

Reports are seller generated and can be edited. Matching codes and serial endings help correlate a conversation; they are not cryptographic hardware attestation. A local enrollment result does not establish organization release or absence of a bypass. Missing/failed Activation Lock or enrollment queries remain unknown. No report establishes successful post-erase online setup. The page does not issue a certified/pass badge.

Unit tests execute the collector's actual embedded JavaScript against synthetic command outputs, covering query failures, privacy filtering, enrollment and lock states, physical SSD handling, import normalization and report freshness. On macOS, an additional end-to-end test runs the complete downloadable zsh script and verifies its saved JSON, check code and private file permissions. It uses a temporary output directory and removes the generated report without uploading it. The end-to-end test is skipped on other platforms; GitHub Pages deployment also requires the macOS job to pass. A real seller-device run and erase/setup validation remain separate acceptance checks.

The collector saves to Downloads by default. For local automation, `MACCHECK_OUTPUT_DIR` may specify an existing output directory; no system environment variables need to be changed.

## GitHub Pages

The public website is served from `dist/` by `.github/workflows/pages.yml`. Pushing to `main` runs the report tests and deploys the static site to GitHub Pages. There is no build step or third-party package installation.

For a fork, enable **Settings → Pages → Source → GitHub Actions**, then run the **Deploy GitHub Pages** workflow. Relative asset paths support project sites below a repository path.

Only the page, collector and supporting code are published. Private device reports, credentials, local hosting metadata and buyer conversations are excluded from the repository and deployment.

Primary reference: https://support.apple.com/102773 and https://support.apple.com/guide/deployment/dep1d89f0bff/web .
