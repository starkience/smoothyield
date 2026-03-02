const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const fs = require("fs");

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

// Prefer browser-compatible builds over Node.js builds.
config.resolver.unstable_conditionNames = ["browser", "require", "default"];

// Force "jose" (used by @privy-io/js-sdk-core) to the browser build so we don't pull in
// Node's "crypto"/"util", which are not available in React Native. Explicit path
// resolution is more reliable than conditionNames for nested dependencies.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "jose" || moduleName.startsWith("jose/")) {
    const nodeModulesPaths = [
      path.join(projectRoot, "node_modules"),
      path.join(monorepoRoot, "node_modules"),
    ];
    for (const nm of nodeModulesPaths) {
      const browserPath = path.join(nm, "jose", "dist", "browser", "index.js");
      if (fs.existsSync(browserPath)) {
        return { type: "sourceFile", filePath: path.resolve(browserPath) };
      }
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Exclude backend, types, and git from the bundle.
config.resolver.blockList = [
  /smoothyield\/backend\/.*/,
  /smoothyield\/types\/.*/,
  /\.git\/.*/,
];

module.exports = config;
