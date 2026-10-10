// Plugin mínimo SOLO para pruebas: app.js usa `import.meta.url`, que Babel no traduce a CommonJS
// (sin esto Jest no puede cargar app.js). Lo reemplaza por el equivalente en CommonJS.
function importMetaUrlParaJest({ template }) {
  const equivalente = template.expression("({ url: require('node:url').pathToFileURL(__filename).href })");
  return {
    visitor: {
      MetaProperty(path) {
        if (path.node.meta.name === 'import' && path.node.property.name === 'meta') path.replaceWith(equivalente());
      },
    },
  };
}

module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }]
  ],
  env: {
    test: { plugins: [importMetaUrlParaJest] },   // Jest define NODE_ENV=test
  },
};
