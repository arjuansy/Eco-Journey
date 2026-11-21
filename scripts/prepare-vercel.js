const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const frontend = path.join(root, "frontend");
const output = path.join(root, "public");
const outputFrontend = path.join(output, "frontend");

fs.mkdirSync(output, { recursive: true });
fs.rmSync(outputFrontend, { recursive: true, force: true });
fs.cpSync(frontend, outputFrontend, { recursive: true });
