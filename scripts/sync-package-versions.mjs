import { access, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const rootDir = process.cwd()
const packageJsonFileName = 'package.json'
const semverPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

const args = process.argv.slice(2).filter((arg) => arg !== '--')
const checkOnly = args.includes('--check')
const unsupportedOptions = args.filter(
  (arg) => arg.startsWith('--') && arg !== '--check',
)
const requestedVersion = args.find((arg) => !arg.startsWith('--'))

if (unsupportedOptions.length > 0) {
  throw new Error(`Unsupported option: ${unsupportedOptions.join(', ')}`)
}

const readJson = async (filePath) =>
  JSON.parse(await readFile(path.join(rootDir, filePath), 'utf8'))

const writeJson = async (filePath, value) => {
  await writeFile(
    path.join(rootDir, filePath),
    `${JSON.stringify(value, null, 2)}\n`,
  )
}

const fileExists = async (filePath) => {
  try {
    await access(path.join(rootDir, filePath))
    return true
  } catch {
    return false
  }
}

const parseWorkspacePatterns = async () => {
  const workspaceFile = await readFile(
    path.join(rootDir, 'pnpm-workspace.yaml'),
    'utf8',
  )
  return Array.from(
    workspaceFile.matchAll(/^\s*-\s*['"]?([^'"\n]+)['"]?\s*$/gm),
  )
    .map((match) => match[1])
    .filter(Boolean)
}

const expandWorkspacePattern = async (pattern) => {
  if (!pattern.endsWith('/*')) {
    return []
  }

  const directory = pattern.slice(0, -2)
  const entries = await readdir(path.join(rootDir, directory), {
    withFileTypes: true,
  })
  const packageFiles = []

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }

    const packageFile = path.join(directory, entry.name, packageJsonFileName)
    if (await fileExists(packageFile)) {
      packageFiles.push(packageFile)
    }
  }

  return packageFiles
}

const listWorkspacePackageFiles = async () => {
  const files = [packageJsonFileName]

  for (const pattern of await parseWorkspacePatterns()) {
    files.push(...(await expandWorkspacePattern(pattern)))
  }

  return Array.from(new Set(files)).sort((left, right) => {
    if (left === packageJsonFileName) {
      return -1
    }
    if (right === packageJsonFileName) {
      return 1
    }
    return left.localeCompare(right)
  })
}

const normalizeVersion = (version) =>
  version.startsWith('v') ? version.slice(1) : version

const rootPackage = await readJson(packageJsonFileName)
const version = normalizeVersion(requestedVersion ?? rootPackage.version)

if (!semverPattern.test(version)) {
  throw new Error(
    `Package version must be SemVer without a v prefix: ${version}`,
  )
}

const packageFiles = await listWorkspacePackageFiles()
const mismatches = []

for (const packageFile of packageFiles) {
  const packageJson = await readJson(packageFile)

  if (packageJson.version !== version) {
    mismatches.push({
      file: packageFile,
      name: packageJson.name,
      currentVersion: packageJson.version,
    })
  }

  if (!checkOnly) {
    packageJson.version = version
    await writeJson(packageFile, packageJson)
  }
}

if (mismatches.length > 0 && checkOnly) {
  for (const mismatch of mismatches) {
    process.stderr.write(
      `${mismatch.file} (${mismatch.name}) is ${mismatch.currentVersion}, expected ${version}\n`,
    )
  }
  process.exit(1)
}

const action = checkOnly ? 'checked' : 'synced'
process.stdout.write(
  `${action} ${packageFiles.length} package versions to ${version}\n`,
)
