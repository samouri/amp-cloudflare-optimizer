const path = require('path')

module.exports = {
  target: 'webworker',
  entry: path.resolve(__dirname, 'index.js'),
  resolve: {
    alias: {
      fs: path.resolve(__dirname, 'fs.js'),
      terser: path.resolve(__dirname, 'terser.js'),
    },
  },
  // necessary for cloudflare worker to be secure since dev mode uses eval()
  mode: 'production',
  devtool: 'none',
}
