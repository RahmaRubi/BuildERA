import 'dotenv/config';
import { parse } from 'csv-parse/sync';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from './DB/models/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'seeders/data');
const BATCH_SIZE = 200;

const SKIP_COLS = new Set(['Name', 'Manufacturer', 'Part #', 'Model', 'URL']);

const CORE_SOURCES = [
  { coreFile: 'Core_CPUs.csv',           type: 'CPU' },
  { coreFile: 'Core_Motherboards.csv',   type: 'Motherboard' },
  { coreFile: 'Core_Memory.csv',         type: 'Memory' },
  { coreFile: 'Core_Video Cards.csv',    type: 'Video Card' },
  { coreFile: 'Core_Cases.csv',          type: 'Case' },
  { coreFile: 'Core_Power Supplies.csv', type: 'Power Supply' },
  { coreFile: 'Core_CPU Coolers.csv',    type: 'CPU Cooler' },
  { coreFile: 'Core_Storage.csv',        type: 'Storage' },
];

function readCSV(filePath) {
  if (!existsSync(filePath)) return [];
  return parse(readFileSync(filePath, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });
}

async function seedSpecsForType({ coreFile, type }) {
  const rows = readCSV(join(DATA_DIR, 'Core Details', 'specs', coreFile));
  console.log(`\n[${type}] ${rows.length} CSV rows — loading existing components...`);

  // Load all components of this type into a name→id map
  const components = await db.Component.findAll({ attributes: ['id', 'name'], where: { type } });
  const nameToId = new Map(components.map(c => [c.name.trim(), c.id]));
  console.log(`  ${nameToId.size} components found in DB`);

  let specInserted = 0;
  let csInserted = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const specRows = [];
    const csMeta = [];

    for (const row of batch) {
      const name = (row.Name || '').trim();
      const compId = nameToId.get(name);
      if (!compId) { skipped++; continue; }

      for (const [col, val] of Object.entries(row)) {
        if (SKIP_COLS.has(col)) continue;
        const v = String(val || '').trim();
        if (!v) continue;
        specRows.push({ name: col });
        csMeta.push({ componentId: compId, value: v });
      }
    }

    if (specRows.length === 0) continue;

    const createdSpecs = await db.Spec.bulkCreate(specRows);
    await db.ComponentSpec.bulkCreate(
      createdSpecs.map((spec, idx) => ({
        component_id: csMeta[idx].componentId,
        spec_id:      spec.id,
        value:        csMeta[idx].value,
      }))
    );

    specInserted += createdSpecs.length;
    csInserted += createdSpecs.length;
    process.stdout.write(`\r  [${type}] ${specInserted} specs inserted...`);
  }

  console.log(`\n  [${type}] done — ${specInserted} specs, ${csInserted} component_specs. Skipped (no match): ${skipped}`);
  return { specInserted, csInserted };
}

async function main() {
  try {
    await db.sequelize.authenticate();
    console.log('DB connected.\n');

    // Check existing specs so we don't double-insert
    const existingSpecs = await db.Spec.count();
    if (existingSpecs > 0) {
      console.log(`WARNING: ${existingSpecs} specs already exist. Aborting to avoid duplicates.`);
      console.log('If you want to re-seed, delete existing specs first.');
      return;
    }

    let totalSpecs = 0;
    let totalCS = 0;

    for (const source of CORE_SOURCES) {
      const { specInserted, csInserted } = await seedSpecsForType(source);
      totalSpecs += specInserted;
      totalCS += csInserted;
    }

    console.log('\n=============================');
    console.log(`Done. Total: ${totalSpecs} specs, ${totalCS} component_specs inserted.`);
  } catch (err) {
    console.error('\nFailed:', err.message);
    process.exit(1);
  } finally {
    await db.sequelize.close();
  }
}

main();
