import { execFileSync } from 'node:child_process'

const trackedFiles = execFileSync('git', ['ls-files', '-z'], {
  encoding: 'utf8',
})
  .split('\0')
  .filter(Boolean)

const generatedPathPatterns = [
  /^apps\/web\/\.next\//,
  /^apps\/server\/dist\//,
  /(^|\/)node_modules\//,
  /(^|\/)\.turbo\//,
  /(^|\/)\.vite\//,
  /(^|\/)\.DS_Store$/,
  /\.tsbuildinfo$/,
]

const forbiddenTrackedFiles = trackedFiles.filter((filePath) =>
  generatedPathPatterns.some((pattern) => pattern.test(filePath)),
)

const trackedEnvFiles = trackedFiles.filter(
  (filePath) =>
    /^\.env($|\.)/.test(filePath) && !filePath.startsWith('.env.example'),
)

const failures = [
  ...forbiddenTrackedFiles.map(
    (filePath) => `generated or local-only file is tracked: ${filePath}`,
  ),
  ...trackedEnvFiles.map(
    (filePath) => `non-example environment file is tracked: ${filePath}`,
  ),
]

if (failures.length > 0) {
  process.stderr.write(`${failures.join('\n')}\n`)
  process.exit(1)
}

process.stdout.write('Repository hygiene checks passed.\n')
