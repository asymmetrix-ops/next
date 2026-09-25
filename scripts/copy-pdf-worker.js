// Copies the pdf.js worker build into /public so it's served same-origin.
// Runs on postinstall so it always matches the installed pdfjs-dist version.
const fs = require("fs");
const path = require("path");

const src = path.join(
  __dirname,
  "..",
  "node_modules",
  "pdfjs-dist",
  "build",
  "pdf.worker.min.mjs"
);
const dest = path.join(__dirname, "..", "public", "pdf.worker.min.mjs");

if (!fs.existsSync(src)) {
  console.warn("[copy-pdf-worker] pdfjs-dist worker build not found, skipping:", src);
  process.exit(0);
}

fs.copyFileSync(src, dest);
console.log("[copy-pdf-worker] copied", src, "->", dest);
