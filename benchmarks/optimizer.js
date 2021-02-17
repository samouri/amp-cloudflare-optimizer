const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const AmpOptimizer = require('@ampproject/toolbox-optimizer')
const nodeFetch = require('node-fetch')

function exec(cmd, args = []) {
  const spawnedProcess = spawnSync(cmd, args, {
    cwd: __dirname,
    env: process.env,
    encoding: 'utf-8',
    stdio: 'pipe',
  })
  if (spawnedProcess.status !== 0) {
    throw new Error(
      `Exec status code: ${spawnedProcess.status}. stderr: "${spawnedProcess.stderr}".`,
    )
  }
  return spawnedProcess.stdout
}

const average = array => array.reduce((a, b) => a + b) / array.length
const deviation = array => {
  const avg = average(array)
  return Math.sqrt(average(array.map(x => Math.pow(x - avg, 2))))
}

const unminifiedOptimizer = AmpOptimizer.create({
  minify: false,
  fetch: (url, init) => nodeFetch(url, init),
  optimizeHeroImages: false,
})

const minifiedOptimizer = AmpOptimizer.create({
  minify: true,
  fetch: (url, init) => nodeFetch(url, init),
  optimizeHeroImages: false,
})

const basicHtmlFilePath = path.join(__dirname, 'examples', 'basic.html')
const basicHtml = fs.readFileSync(basicHtmlFilePath, 'utf8')
const ampDevHtmlFilePath = path.join(__dirname, 'examples', 'amp.dev.html')
const ampDevHtml = fs.readFileSync(ampDevHtmlFilePath, 'utf8')

let runs = 100
let output = ''
async function runTest(name, fn) {
  let results = []
  for (let i = 0; i < runs; i++) {
    const startTime = Date.now()
    await fn()
    results.push(Date.now() - startTime)
  }
  output += `Test: ${name}\n`
  output += `   Mean=${average(results)}\n`
  output += `   StdDev=${deviation(results)}\n`
}

async function main() {
  await runTest('basic.html (unminified)', () =>
    unminifiedOptimizer.transformHtml(basicHtml, {
      canonical: 'google.com',
    }),
  )

  await runTest('amp.dev.html (unminified)', () =>
    unminifiedOptimizer.transformHtml(ampDevHtml, {
      canonical: 'google.com',
    }),
  )

  await runTest('basic.html (minified)', () =>
    minifiedOptimizer.transformHtml(basicHtml, {
      canonical: 'google.com',
    }),
  )

  await runTest('amp.dev.html (minified)', () =>
    minifiedOptimizer.transformHtml(ampDevHtml, { canonical: 'google.com' }),
  )

  await runTest('GO: amp.dev.html', () =>
    exec('/Users/friedj/go/bin/transform', [
      '/Users/friedj/Repos/cloudflare-worker/benchmarks/examples/amp.dev.html',
    ]),
  )

  await runTest('GO: basic.html', () =>
    exec('/Users/friedj/go/bin/transform', [
      '/Users/friedj/Repos/cloudflare-worker/benchmarks/examples/basic.html',
    ]),
  )

  await runTest('exec: echo', () => exec('echo', ['Hello, World']))

  console.log(output)
}

main()
