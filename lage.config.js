/** @type {import("lage").ConfigOptions} */
module.exports = {
  pipeline: {
    build: ["^build"],
    test: ["build"],
    lint: [],
    format: [],
    dev: ["build"],
  },
  cache: true,
  cacheOptions: {
    // Use local filesystem cache
    outputGlob: ["dist/**", "build/**", ".next/**"],
  },
};
