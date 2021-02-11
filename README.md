# AMP Cloudflare Optimizer

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/samouri/amp-cloudflare-optimizer)

See it in action at https://amp-optimizer.friedj-google.workers.dev'

## Usage

1. Create your own Cloudflare Worker Repo using this as a template.

```bash
wrangler generate my-worker  https://github.com/samouri/amp-cloudflare-optimizer
```

2. Customize the configuration at `optimizer-config.js` to point to your domain name.

```js
module.export = {
  domain: 'YOUR_DOMAIN_NAME',
}
```

3. Publish!

```bash
wrangler publish
```

### Customizing the cache values

You may customize the fetch cache used by the Cloudflare Worker by modifying the values in `optimizer-config.js`. See the [Cloudflare Docs](https://developers.cloudflare.com/workers/runtime-apis/request#requestinitcfproperties) for more details. We currenlty only support updating two values: `cacheEverything` and `ttl`.

```js
module.export = {
  cache: {
    everything: true, // default: false
    ttl: 3600, // default: 0
  },
}
```

### Usage as a reverse proxy

**Note**: This is not recommended as compared to the route interceptor. In this mode, it may only fail-closed as opposed to [fail open](https://blog.cloudflare.com/dogfooding-edge-workers/).

```js
module.export = {
  from: 'YOUR_WORKER_DOMAIN', // Provide the domain name that your cloudflare worker is be deployed to.
  to: 'YOUR_SERVER_IP', // Provide IP Address or Domain Name where requests should be proxied to.
}
```
