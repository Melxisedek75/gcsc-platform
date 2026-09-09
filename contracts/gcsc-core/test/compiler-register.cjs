// The upstream CLI shebang uses ts-node-transpile-only. Register its TS transforms
// explicitly when invoking Node without a shell; contract checking remains in ASC.
require('ts-node').register({ transpileOnly: true, skipIgnore: true, skipProject: true,
  compilerOptions: { module: 'commonjs', allowJs: false } });
