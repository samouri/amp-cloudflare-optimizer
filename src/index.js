const AmpOptimizer = require('@ampproject/toolbox-optimizer')
const config = require('../config.json')
const linkRewriter = require('./link-rewriter')

// Ensure config is valid
if (config.from || config.to) {
  if (!config.from || !config.to) {
    throw new Error(
      `If using Cloudflare Worker as your primary domain, you must provide both a "from" and "to" address in optimizer-config.js`,
    )
  }
}
if (config.domain) {
  if (config.from || config.to) {
    throw new Error(
      `If using Cloudflare Worker as a route interceptor, "from" and "to" are unnecessary. Please delete them from optimizer-config.js`,
    )
  }
}

/**
 * 1. minify:false is necessary to speed up the AmpOptimizer. terser also cannot be used since dynamic eval() is part of terser and banned by CloudflareWorkers.
 *    see the webpack.config.js for how we disable the terser module.
 * 2. fetch is set to Cloudflare Worker provided fetch, with high caching to amortize startup time for each AmpOptimizer instance.
 */
const ampOptimizer = AmpOptimizer.create({
  minify: false,
  fetch: (url, init) =>
    fetch(url, {
      ...init,
      cf: {
        cacheEverything: true,
        cacheTtl: 60 * 60 * 6,
      },
    }),
})

/**
 * HrefRewriter for rewriting all links to point back to the reverse-proxy instead of the underlying
 * domain.
 */

async function handleRequest(request) {
  const url = new URL(request.url)
  if (config.to && (!config.from || url.hostname === config.from)) {
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
  event.passThroughOnException()
  return event.respondWith(handleRequest(event.request))
})