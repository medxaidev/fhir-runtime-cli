#!/usr/bin/env node

import { run } from '../dist/esm/index.mjs';

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
