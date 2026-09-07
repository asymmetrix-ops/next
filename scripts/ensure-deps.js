const { execSync } = require("child_process");

const REQUIRED_DEPS = ["@sentry/nextjs"];

const missing = REQUIRED_DEPS.filter((dep) => {
  try {
    require.resolve(dep);
    return false;
  } catch {
    return true;
  }
});

if (missing.length === 0) {
  process.exit(0);
}

console.log(`Missing dependencies: ${missing.join(", ")}`);
console.log("Installing...");

execSync(`npm install ${missing.join(" ")}`, {
  stdio: "inherit",
  env: process.env,
});
