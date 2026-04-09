import { generateOutputs, writeOutputs } from "./contract-generation-lib.mjs";

const outputs = generateOutputs();
writeOutputs(outputs);

for (const relativePath of outputs.keys()) {
  console.log(`generated ${relativePath}`);
}
