process.env.NODE_ENV = 'test'
process.env.CI = true // needed for some "clever" build tools

import fs from 'fs-extra'
import path from 'path'
import { execa } from 'execa'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dir = path.join(__dirname, process.argv[2])

testExample(dir)
  .then(() => {}, (err) => {
    if (err.exitCode) {
      process.exit(err.exitCode)
    }

    console.error(err)
    process.exit(1)
  })

async function testExample (dir) {
  await installDeps(dir)
  await build(dir)
  await runTest(dir)
}

async function installDeps (dir) {
  if (!fs.existsSync(path.join(dir, 'package.json'))) {
    console.info('Nothing to install in', dir)
    return
  }

  if (fs.existsSync(path.join(dir, 'node_modules'))) {
    console.info('Dependencies already installed in', dir)
    return
  }

  const proc = execa('npm', ['install'], {
    all: true,
    cwd: dir
  })
  proc.all.on('data', (data) => {
    process.stdout.write(data)
  })

  await proc
}

async function build (dir) {
  const pkgJson = path.join(dir, 'package.json')

  if (!fs.existsSync(pkgJson)) {
    console.info('Nothing to build in', dir)
    return
  }

  const pkg = JSON.parse(fs.readFileSync(pkgJson))
  let build

  if (pkg.scripts.bundle) {
    build = 'bundle'
  }

  if (pkg.scripts.build) {
    build = 'build'
  }

  if (!build) {
    console.info('No "build" or "bundle" script in', pkgJson)
    return
  }

  const proc = execa('npm', ['run', build], {
    all: true,
    cwd: dir
  })
  proc.all.on('data', (data) => {
    process.stdout.write(data)
  })

  await proc
}

async function runTest (dir) {
  console.info('Running node tests in', dir)
  const testFile = path.join(dir, 'test.js')

  if (!fs.existsSync(testFile)) {
    console.info('Nothing to test in', dir)
    return
  }

  const { test } = await import(testFile)

  await test()
}
