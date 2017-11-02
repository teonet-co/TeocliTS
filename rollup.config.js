export default {
  entry: 'dist/index.js',
  dest: 'dist/bundles/teocli.umd.js',
  sourceMap: false,
  format: 'umd',
  moduleName: 'ng.teocli',
  globals: {
    '@angular/core': 'ng.core'
  }
}
