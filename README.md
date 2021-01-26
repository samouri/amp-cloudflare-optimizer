# AMP Cloudflare Optimizer

See it in action at https://amp-optimizer.friedj-google.workers.dev'

## Usage

1. Create your own Cloudflare Worker Repo using this as a template.

```bash
wrangler generate my-worker  https://github.com/samouri/amp-cloudflare-optimizer
```

2. Customize the config to point to your server

```js
module.export = {
  to: 'YOUR_SERVER_IP', // Provide IP Address or Domain Name where requests should be proxied to.
}
```

3. Publish!

```bash
wrangler publish
```
