const AmpOptimizer = require('@ampproject/toolbox-optimizer')
const ampOptimizer = AmpOptimizer.create({verbose: false})

const HTML_URL =
  'https://raw.githubusercontent.com/samouri/amp-cloudflare-optimizer/main/docs/index.html'
async function handleRequest(request) {
  // TODO: how can this be diff per request.
  const htmlPromise = fetch(HTML_URL).then(r => r.text())
  const optimizedHtml = htmlPromise.then(html =>
    ampOptimizer.transformHtml(html),
  )

  return optimizedHtml.then(html => {
    return new Response(html, {
      headers: {
        'content-type': 'text/html;charset=UTF-8',
      },
    })
  })
}

addEventListener('fetch', event => {
  return event.respondWith(handleRequest(event.request))
})
