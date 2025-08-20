/** @type {import("lage").ConfigOptions} */
module.exports = {
  pipeline: {
    build: ["^build"],
    test: ["build"],
    "test:coverage": ["build"],
    lint: [],
    format: [],
    dev: ["build"],
    start: ["build"],
  },
  cache: true,
  cacheOptions: {
    // Use local filesystem cache
    outputGlob: ["dist/**", "build/**", ".next/**"],
  },
};
