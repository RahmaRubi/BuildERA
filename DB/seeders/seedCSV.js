import { parse } from 'csv-parse/sync';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from '../models/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR    = join(__dirname, '../../seeders/data');
const PROGRESS_FILE = join(__dirname, '../../seeders/progress.json');

const SKIP_COLS = new Set(['Name', 'Manufacturer', 'Part #', 'Model', 'URL']);
const BATCH_SIZE = 100;

const SOURCES = [
  { coreFile: 'Core_CPUs.csv',           type: 'CPU',          productFile: 'CPUs.csv' },
  { coreFile: 'Core_Motherboards.csv',   type: 'Motherboard',  productFile: 'Motherboards.csv' },
  { coreFile: 'Core_Memory.csv',         type: 'Memory',       productFile: 'Memory.csv' },
  { coreFile: 'Core_Video Cards.csv',    type: 'Video Card',   productFile: 'Video Cards.csv' },
  { coreFile: 'Core_Cases.csv',          type: 'Case',         productFile: 'Cases.csv' },
  { coreFile: 'Core_Power Supplies.csv', type: 'Power Supply', productFile: 'Power Supplies.csv' },
  { coreFile: 'Core_CPU Coolers.csv',    type: 'CPU Cooler',   productFile: 'CPU Coolers.csv' },
];

// ── Progress helpers ──────────────────────────────────────────────────────────

function loadProgress() {
  if (!existsSync(PROGRESS_FILE)) return { done: [] };
  try {
    const raw = JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'));
    // Handle old format from previous seeder
    if (!Array.isArray(raw.done)) return { done: [] };
    return raw;
  } catch {
    return { done: [] };
  }
}

function saveProgress(progress) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

function readCSV(filePath) {
  if (!existsSync(filePath)) return [];
  return parse(readFileSync(filePath, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });
}

function buildProductLookup(productFile) {
  const rows = readCSV(join(DATA_DIR, 'Products', 'Core', productFile));
  const map = new Map();
  for (const row of rows) {
    const name = (row.Name || '').trim();
    if (name) map.set(name, {
      price:    parseFloat(row.Price) || null,
      imageUrl: row.Image || null,
    });
  }
  return map;
}

function extractBrand(manufacturer, name) {
  const cleaned = (manufacturer || '').split(',')[0].trim();
  return cleaned || (name || '').split(' ')[0];
}

// ── Core seeder ───────────────────────────────────────────────────────────────

async function seedType({ coreFile, type, productFile }, progress) {
  if (progress.done.includes(type)) {
    console.log(`[${type}] already done — skipping`);
    return 0;
  }

  // Clean up any partial data from a previous interrupted run
  const existing = await db.Component.count({ where: { type } });
  if (existing > 0) {
    console.log(`[${type}] found ${existing} partial rows from last run — cleaning up...`);
    await db.Component.destroy({ where: { type } });
  }

  const rows       = readCSV(join(DATA_DIR, 'Core Details', 'specs', coreFile));
  const products   = buildProductLookup(productFile);
  const total      = rows.length;

  console.log(`\n[${type}] ${total} rows — seeding in batches of ${BATCH_SIZE}...`);

  let inserted = 0;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const componentData = [];
    const specData      = [];

    for (const row of batch) {
      const name = (row.Name || '').trim();
      if (!name) continue;

      const product  = products.get(name);
      const price    = product?.price ?? null;
      const imageUrl = product?.imageUrl ?? null;
      const brand    = extractBrand(row.Manufacturer, name);
      const specs    = {};

      for (const [col, val] of Object.entries(row)) {
        if (SKIP_COLS.has(col)) continue;
        const v = String(val || '').trim();
        if (v) specs[col] = v;
      }

      componentData.push({ name, type, brand, price, imageUrl });
      specData.push(specs);
    }

    if (componentData.length === 0) continue;

    // 1 — components
    const created = await db.Component.bulkCreate(componentData);

    // 2 — specs + parallel meta for componentSpec values
    const specRows = [];
    const specMeta = [];
    for (let j = 0; j < created.length; j++) {
      const compId = created[j].id;
      for (const [specName, specValue] of Object.entries(specData[j])) {
        specRows.push({ name: specName, component_id: compId });
        specMeta.push({ componentId: compId, value: specValue });
      }
    }

    // 3 — specs bulk insert
    const createdSpecs = await db.Spec.bulkCreate(specRows);

    // 4 — componentSpecs bulk insert
    await db.ComponentSpec.bulkCreate(
      createdSpecs.map((spec, idx) => ({
        component_id: specMeta[idx].componentId,
        spec_id:      spec.id,
        value:        specMeta[idx].value,
      }))
    );

    inserted += componentData.length;

    // Save progress after every batch so a restart knows how far we got
    progress.lastBatch = { type, batchStart: i + BATCH_SIZE, inserted };
    saveProgress(progress);

    const pct = Math.min(100, Math.round(((i + BATCH_SIZE) / total) * 100));
    process.stdout.write(`\r  [${type}] ${inserted} inserted (${pct}%)`);
  }

  // Mark type as fully done
  progress.done.push(type);
  delete progress.lastBatch;
  saveProgress(progress);

  console.log(`\n  [${type}] complete: ${inserted} inserted`);
  return inserted;
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function seed() {
  try {
    await db.sequelize.authenticate();
    await db.sequelize.sync();
    console.log('DB connected.\n');

    const progress = loadProgress();

    if (progress.done.length > 0) {
      console.log(`Resuming — already done: ${progress.done.join(', ')}`);
    }

    let total = 0;
    for (const source of SOURCES) {
      total += await seedType(source, progress);
    }

    console.log('\n=============================');
    console.log(`Seeding complete. Total inserted: ${total} components.`);
  } catch (err) {
    console.error('\nSeeding failed:', err.message);
    process.exit(1);
  } finally {
    await db.sequelize.close();
  }
}

seed();
