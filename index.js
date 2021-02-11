const config = require('./optimizer-config')
const AmpOptimizer = require('@ampproject/toolbox-optimizer')

/**
 * 1. minify:false is necessary to speed up the AmpOptimizer. terser also cannot be used since dynamic eval() is part of terser and banned by CloudflareWorkers.
 *    see the webpack.config.js for how we disable the terser module.
 * 2. fetch is modified to immediately throw. This is because we want the AmpOptimizer to act as quickly as possible. Startup cost is not amortized since it is initiated on each request.
 */
const ampOptimizer = AmpOptimizer.create({
  minify: false,
  fetch: (url, init) => fetch(url, {...init, cf: {
      cacheEverything: true,
      cacheTtl: 60 * 60 * 6,

  }}),
})

/**
 * HrefRewriter for rewriting all links to point back to the reverse-proxy instead of the underlying
 * domain.
 */

class HrefRewriter {
  element(element) {
    const href = element.getAttribute('href')
    if (ENVIRONMENT === 'dev') {
      element.setAttribute('href', href.replace(config.to, 'localhost'))
      return
    }
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
    cf: {
      cacheEverything: config.cache ? config.cache.everything : undefined,
      cacheTtl: config.cache ? config.cache.ttl : undefined,
    },
  })
  const clonedResponse = response.clone()
  const { headers, status, statusText } = response

  // Turns out that content-type lies ~25% of the time.
  // See: https://blog.cloudflare.com/html-parsing-1/
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
