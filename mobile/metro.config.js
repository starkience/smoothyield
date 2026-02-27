const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// Watch both the mobile dir and the monorepo root node_modules (where hoisted packages live).
config.watchFolders = [monorepoRoot];

// Resolve modules from both the mobile dir and the monorepo root node_modules.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Exclude backend, types, and git from the bundle.
config.resolver.blockList = [
  /smoothyield\/backend\/.*/,
  /smoothyield\/types\/.*/,
  /\.git\/.*/,
];

module.exports = config;
