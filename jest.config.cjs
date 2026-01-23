module.exports = {
  testEnvironment: "node",
  testMatch: [
    "**/?(*.)+(spec|test).js",
  ],
  testPathIgnorePatterns: [
    "/dist/",
    "/node_modules/",
  ],
  passWithNoTests: true,
};
