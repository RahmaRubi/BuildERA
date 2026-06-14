import 'dotenv/config';
import { parse } from 'csv-parse/sync';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from '../models/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR    = join(__dirname, '../../seeders/data');
const PROGRESS_FILE = join(__dirname, '../../seeders/progress.json');

const CORE_SKIP_COLS = new Set(['Name', 'Manufacturer', 'Part #', 'Model', 'URL']);
const BATCH_SIZE = 100;

// Core types: components + specs come from Core Details CSVs; price/imageUrl/url from Products CSVs
const CORE_SOURCES = [
  { coreFile: 'Core_CPUs.csv',           type: 'CPU',          productFile: 'CPUs.csv' },
  { coreFile: 'Core_Motherboards.csv',   type: 'Motherboard',  productFile: 'Motherboards.csv' },
  { coreFile: 'Core_Memory.csv',         type: 'Memory',       productFile: 'Memory.csv' },
  { coreFile: 'Core_Video Cards.csv',    type: 'Video Card',   productFile: 'Video Cards.csv' },
  { coreFile: 'Core_Cases.csv',          type: 'Case',         productFile: 'Cases.csv' },
  { coreFile: 'Core_Power Supplies.csv', type: 'Power Supply', productFile: 'Power Supplies.csv' },
  { coreFile: 'Core_CPU Coolers.csv',    type: 'CPU Cooler',   productFile: 'CPU Coolers.csv' },
  { coreFile: 'Core_Storage.csv',        type: 'Storage',      productFile: 'Storage.csv' },
];

// ── Progress helpers ──────────────────────────────────────────────────────────

function loadProgress() {
  if (!existsSync(PROGRESS_FILE)) return { done: [], urlsBackfilled: [] };
  try {
    const raw = JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'));
    if (!Array.isArray(raw.done)) return { done: [], urlsBackfilled: [] };
    if (!Array.isArray(raw.urlsBackfilled)) raw.urlsBackfilled = [];
    return raw;
  } catch {
    return { done: [], urlsBackfilled: [] };
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
      url:      row.URL   || null,
    });
  }
  return map;
}

function extractBrand(manufacturer, name) {
  const cleaned = (manufacturer || '').split(',')[0].trim();
  return cleaned || (name || '').split(' ')[0];
}

async function bulkInsertSpecs(created, specData) {
  const specRows = [];
  const specMeta = [];
  for (let j = 0; j < created.length; j++) {
    const compId = created[j].id;
    for (const [specName, specValue] of Object.entries(specData[j])) {
      specRows.push({ name: specName, component_id: compId });
      specMeta.push({ componentId: compId, value: specValue });
    }
  }
  if (specRows.length === 0) return;
  const createdSpecs = await db.Spec.bulkCreate(specRows);
  await db.ComponentSpec.bulkCreate(
    createdSpecs.map((spec, idx) => ({
      component_id: specMeta[idx].componentId,
      spec_id:      spec.id,
      value:        specMeta[idx].value,
    }))
  );
}

// ── Phase 1: seed core types (specs from Core CSVs) ──────────────────────────

async function seedCoreType({ coreFile, type, productFile }, progress) {
  if (progress.done.includes(type)) {
    console.log(`[${type}] already done — skipping`);
    return 0;
  }

  const existing = await db.Component.count({ where: { type } });
  if (existing > 0) {
    console.log(`[${type}] found ${existing} partial rows — cleaning up...`);
    await db.sequelize.query(
      'DELETE cu FROM ComponentUrls cu INNER JOIN Components c ON cu.component_id = c.id WHERE c.type = ?',
      { replacements: [type] }
    );
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.Component.destroy({ where: { type } });
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  }

  const rows     = readCSV(join(DATA_DIR, 'Core Details', 'specs', coreFile));
  const products = buildProductLookup(productFile);
  const total    = rows.length;

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
      const specs    = {};

      for (const [col, val] of Object.entries(row)) {
        if (CORE_SKIP_COLS.has(col)) continue;
        const v = String(val || '').trim();
        if (v) specs[col] = v;
      }

      componentData.push({
        name,
        type,
        brand:    extractBrand(row.Manufacturer, name),
        price:    product?.price    ?? null,
        imageUrl: product?.imageUrl ?? null,
      });
      specData.push(specs);
    }

    if (componentData.length === 0) continue;

    const created = await db.Component.bulkCreate(componentData);
    await bulkInsertSpecs(created, specData);

    const urlRecords = [];
    for (let j = 0; j < created.length; j++) {
      const product = products.get(componentData[j].name);
      if (product?.url) urlRecords.push({ component_id: created[j].id, url: product.url });
    }
    if (urlRecords.length > 0) await db.ComponentUrl.bulkCreate(urlRecords);

    inserted += componentData.length;
    progress.lastBatch = { type, batchStart: i + BATCH_SIZE, inserted };
    saveProgress(progress);

    const pct = Math.min(100, Math.round(((i + BATCH_SIZE) / total) * 100));
    process.stdout.write(`\r  [${type}] ${inserted} inserted (${pct}%)`);
  }

  progress.done.push(type);
  delete progress.lastBatch;
  saveProgress(progress);

  console.log(`\n  [${type}] complete: ${inserted} inserted`);
  return inserted;
}

// ── Phase 2: backfill url for already-seeded core types ───────────────────────

async function backfillCoreUrls(progress) {
  console.log('\n--- Backfilling URLs for core types ---');

  for (const { type, productFile } of CORE_SOURCES) {
    if (progress.urlsBackfilled.includes(type)) {
      console.log(`[${type}] URLs already backfilled — skipping`);
      continue;
    }

    const products = buildProductLookup(productFile);
    let updated = 0;

    for (const [name, { url }] of products.entries()) {
      if (!url) continue;
      const component = await db.Component.findOne({ where: { name, type } });
      if (!component) continue;
      const exists = await db.ComponentUrl.findOne({ where: { component_id: component.id, url } });
      if (!exists) {
        await db.ComponentUrl.create({ component_id: component.id, url });
        updated++;
      }
    }

    progress.urlsBackfilled.push(type);
    saveProgress(progress);
    console.log(`  [${type}] added ${updated} URLs`);
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function seed() {
  try {
    await db.sequelize.authenticate();
    await db.sequelize.sync();
    console.log('DB connected.\n');

    const progress = loadProgress();

    if (progress.done.length > 0) {
      console.log(`Resuming — core done: ${progress.done.join(', ')}`);
    }

    // Phase 1 — core types (skips already-done ones)
    let total = 0;
    for (const source of CORE_SOURCES) {
      total += await seedCoreType(source, progress);
    }

    // Phase 2 — backfill url on already-seeded core components
    await backfillCoreUrls(progress);

    console.log('\n=============================');
    console.log(`Seeding complete. Components inserted this run: ${total}`);
  } catch (err) {
    console.error('\nSeeding failed:', err.message);
    process.exit(1);
  } finally {
    await db.sequelize.close();
  }
}

seed();
