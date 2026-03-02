const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const fs = require("fs");

const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// Resolve "jose" to its browser build so we don't pull in Node's "crypto"/"util"
// (used by @privy-io/js-sdk-core). React Native doesn't include Node stdlib.
function resolveJoseToBrowserBuild(context, moduleName, platform) {
  if (moduleName !== "jose" && !moduleName.startsWith("jose/")) {
    return context.resolveRequest(context, moduleName, platform);
  }
  const nodeModulesPaths = [
    path.join(projectRoot, "node_modules"),
    path.join(projectRoot, "mobile", "node_modules"),
  ];
  for (const nm of nodeModulesPaths) {
    const browserPath = path.join(nm, "jose", "dist", "browser", "index.js");
    if (fs.existsSync(browserPath)) {
      return { type: "sourceFile", filePath: path.resolve(browserPath) };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
}

// Block resolving backend / tradfi-backend so Metro never tries to bundle server code.
// Workspaces can make "backend" resolvable; we want the app to use the API over HTTP only.
function blockBackendAndResolve(context, moduleName, platform) {
  const blocked = ["backend", "tradfi-backend", "types"];
  if (blocked.includes(moduleName) || moduleName.startsWith("backend/") || moduleName.startsWith("tradfi-backend/")) {
    return { type: "empty" };
  }
  // Path-style requests from root (e.g. ./backend/dist/index)
  if (moduleName.startsWith("./backend") || moduleName.startsWith("backend/dist")) {
    return { type: "empty" };
  }
  return resolveJoseToBrowserBuild(context, moduleName, platform);
}

config.resolver.resolveRequest = blockBackendAndResolve;

// Exclude backend and types from the bundle when running from root.
config.resolver.blockList = [
  /smoothyield\/backend\/.*/,
  /smoothyield\/types\/.*/,
  /\.git\/.*/,
];

module.exports = config;
