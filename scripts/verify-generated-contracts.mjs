import { generateOutputs, verifyOutputs } from "./contract-generation-lib.mjs";

const outputs = generateOutputs();
const mismatches = verifyOutputs(outputs);

if (mismatches.length > 0) {
  console.error("Generated contract files are out of date:");
  for (const filePath of mismatches) {
    console.error(`- ${filePath}`);
  }
  process.exit(1);
}

console.log("Generated contract files are up to date.");
