/**
 * Remove `.next` before production build. On Windows, deletes can fail with EBUSY
 * if `next dev`, the editor, OneDrive, or AV holds files open — retry with backoff.
 */
const fs = require('fs')
const { execSync } = require('child_process')
const path = require('path')

const target = path.join(process.cwd(), '.next')

function sleepWindowsSeconds(sec) {
  execSync(`timeout /t ${sec} /nobreak >nul 2>&1`, { stdio: 'ignore', windowsHide: true })
}

function sleepUnixSeconds(sec) {
  execSync(`sleep ${sec}`, { stdio: 'ignore' })
}

/** Brief pause between retries (~1s) so locks can drop. */
function pauseBetweenRetries() {
  try {
    if (process.platform === 'win32') sleepWindowsSeconds(1)
    else sleepUnixSeconds(1)
  } catch {
    /* ignore — continue to next attempt */
  }
}

if (!fs.existsSync(target)) {
  process.exit(0)
}

const opts = { recursive: true, force: true }

// Try Node’s built‑in EBUSY retries first when available (Node 20.11+, 22+)
const majors = process.versions.node.split('.').map((s) => parseInt(s, 10))
const [major, minor] = majors
let rmOpts = opts
if (major > 20 || (major === 20 && minor >= 11) || major >= 22) {
  rmOpts = { ...opts, maxRetries: 15, retryDelay: 150 }
}

const maxAttempts = 10

for (let i = 0; i < maxAttempts; i++) {
  try {
    fs.rmSync(target, rmOpts)
    process.exit(0)
  } catch (err) {
    const code = err?.code
    const retryable = code === 'EBUSY' || code === 'EPERM' || code === 'ENOTEMPTY'

    const lastAttempt = i === maxAttempts - 1
    if (!retryable || lastAttempt) {
      console.error(err?.message || err)
      console.error(
        '\nCould not delete `.next` (files are locked). On Windows this is common if:\n' +
          '  • `npm run dev` is still running — stop it first\n' +
          '  • OneDrive is syncing this folder — pause sync or exclude the project\n' +
          '  • Another IDE or build process has the repo open\n\n' +
          'Try again after closing those. To build without deleting `.next`:\n' +
          '  npm run build:no-clean\n'
      )
      process.exit(1)
    }
    pauseBetweenRetries()
    // Fallback: retries without rmSync maxRetries if it was set (some failures happen after retries)
    rmOpts = opts
  }
}
