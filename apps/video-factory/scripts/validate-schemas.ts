/**
 * Smoke test: load and compile every JSON Schema. Proves the schema files are
 * valid and that `src/core/validators.ts` can register them (cross-file $refs
 * included). Run with: `npm run validate:schemas`.
 */

import { getAjv, loadAllSchemas } from "../src/core/validators.js";

function main(): void {
  getAjv(); // registers all schemas; throws if any file is invalid JSON Schema
  const names = loadAllSchemas(); // compiles each named schema
  for (const name of names) {
    console.log(`  ok  ${name}`);
  }
  console.log(`\n✓ ${names.length} schemas compiled successfully.`);
}

main();
