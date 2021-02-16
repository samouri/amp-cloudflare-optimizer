const fs = require('fs')
const path = require('path') 
const nodeFetch = require('node-fetch')
const AmpOptimizer = require('@ampproject/toolbox-optimizer')

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

let runs = 100;
let output = "";
async function runTest(name, html) {
  let unminifiedResults = []
  for (let i = 0; i < runs; i++) {
    const startTime = Date.now()
    await unminifiedOptimizer.transformHtml(html, { canonical: 'google.com' })
    unminifiedResults.push(Date.now() - startTime);
  }

  let minifiedResults = []
  for (let i = 0; i < runs; i++) {
    const startTime = Date.now()
    await minifiedOptimizer.transformHtml(html, { canonical: 'google.com' })
    minifiedResults.push(Date.now() - startTime);
  }
  output += `Test: ${name} (minified)\n`;
  output += `   Mean=${average(minifiedResults)}\n`
  output += `   StdDev=${deviation(minifiedResults)}\n` 

  output += `Test: ${name} (unminifed)\n`;
  output += `   Mean=${average(unminifiedResults)}\n`
  output += `   StdDev=${deviation(unminifiedResults)}\n` 
}

async function main() { 
  await runTest("basic.html", basicHtml);
  await runTest("amp.dev.html", ampDevHtml); 
  console.log(output);
}

main();

