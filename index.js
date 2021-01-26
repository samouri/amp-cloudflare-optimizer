const config = require('./optimizer-config')
const AmpOptimizer = require('@ampproject/toolbox-optimizer')
const ampOptimizer = AmpOptimizer.create({ verbose: false, minify: false })

/**
 * HrefRewriter for rewriting all links to point back to the reverse-proxy instead of the underlying
 * domain.
 */

class HrefRewriter {
  element(element) {
    const href = element.getAttribute('href')
    element.setAttribute('href', href.replace(config.to, config.from))
  }
}
const linkRewriter = new HTMLRewriter().on('a', new HrefRewriter())

async function handleRequest(request) {
  const url = new URL(request.url)
  if (!config.from || url.hostname === config.from) {
    url.hostname = config.to
  }

  const response = await fetch(url.toString(), {
    cf: { cacheTtl: 3600, cacheEverything: true },
  })
  const clonedResponse = response.clone()
  const { headers, status, statusText } = response
  const responseText =
    headers.get('content-type').includes('text/html') && (await response.text())

  // Turns out that content-type lies ~25% of the time.
  // See: https://blog.cloudflare.com/html-parsing-1/
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
    const r = new Response(transformed, { headers, statusText, status })
    return linkRewriter.transform(r)
  } catch (err) {
    console.error(`Failed to optimize: ${url.toString()}, with Error; ${err}`)
    return clonedResponse
  }
}

addEventListener('fetch', event => {
  return event.respondWith(handleRequest(event.request))
})
