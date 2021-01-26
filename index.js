const config = require('./optimizer-config')
const AmpOptimizer = require('@ampproject/toolbox-optimizer')
const ampOptimizer = AmpOptimizer.create({ verbose: false, minify: false })

async function handleRequest(request) {
  const url = new URL(request.url)
  if (!config.from || url.hostname === config.from) {
    url.hostname = config.to
  }

  const response = await fetch(url.toString())
  const clonedResponse = response.clone()
  const { headers, status, statusText } = response
  const responseText =
    headers.get('content-type').includes('text/html') && (await response.text())
  const isHtml = responseText && responseText.startsWith('<')

  // If not HTML then return original response unchanged.
  if (!isHtml) {
    const contentType = headers.get('content-type')
    console.log(
      `Proxying unoptimized: ${url.toString()}, content-type: ${contentType}`,
    )
    return clonedResponse
  }

  console.log(`Optimizing: ${url.toString()}`)
  try {
    const transformed = await ampOptimizer.transformHtml(responseText)
    return new Response(transformed, { headers, statusText, status })
  } catch (err) {
    console.error(`Failed to optimize: ${url.toString()}, with Error; ${err}`)
    return clonedResponse
  }
}

addEventListener('fetch', event => {
  return event.respondWith(handleRequest(event.request))
})
