/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: ["<rootDir>/node_modules", "<rootDir>/dist"],
  testRegex: "(/__tests__/.*| (\\.| /)(test|spec))\\.ts?$",
};
