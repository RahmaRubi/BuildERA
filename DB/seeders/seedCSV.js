import 'dotenv/config';
import { parse } from 'csv-parse/sync';
import { readFileSync, existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from '../models/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR      = join(__dirname, '../../seeders/data');
const PROGRESS_FILE = join(__dirname, '../../seeders/progress.json');
const BATCH_SIZE    = 100;

// Columns to exclude when extracting specs from each CSV source
const SPEC_SKIP = new Set(['Name', 'Manufacturer', 'Part #', 'Model', 'URL']);
const PROD_SKIP = new Set(['Name', 'URL', 'Image', 'Price']);

const SOURCES = [
  { specFile: 'Core_CPUs.csv',           type: 'CPU',          productFile: 'CPUs.csv',           dataFile: 'Core_CPUs.json',           matchCols: ['Core Count', 'Performance Core Clock', 'Performance Core Boost Clock'] },
  { specFile: 'Core_Motherboards.csv',   type: 'Motherboard',  productFile: 'Motherboards.csv',   dataFile: 'Core_Motherboards.json',   matchCols: ['Socket / CPU', 'Form Factor', 'Memory Slots', 'Color'] },
  { specFile: 'Core_Memory.csv',         type: 'Memory',       productFile: 'Memory.csv',         dataFile: 'Core_Memory.json',         matchCols: ['Speed', 'Modules', 'CAS Latency', 'Color'] },
  { specFile: 'Core_Video Cards.csv',    type: 'Video Card',   productFile: 'Video Cards.csv',    dataFile: 'Core_Video Cards.json',    matchCols: ['Chipset', 'Memory', 'Core Clock', 'Color'] },
  { specFile: 'Core_Cases.csv',          type: 'Case',         productFile: 'Cases.csv',          dataFile: 'Core_Cases.json',          matchCols: ['Type', 'Color', 'Side Panel'] },
  { specFile: 'Core_Power Supplies.csv', type: 'Power Supply', productFile: 'Power Supplies.csv', dataFile: 'Core_Power Supplies.json', matchCols: ['Type', 'Wattage', 'Efficiency Rating', 'Color'] },
  { specFile: 'Core_CPU Coolers.csv',    type: 'CPU Cooler',   productFile: 'CPU Coolers.csv',    dataFile: 'Core_CPU Coolers.json',    matchCols: ['Fan RPM', 'Noise Level', 'Color'] },
  { specFile: 'Core_Storage.csv',        type: 'Storage',      productFile: 'Storage.csv',        dataFile: 'Core_Storage.json',        matchCols: ['Form Factor', 'Interface', 'Capacity'] },
];

// ── helpers ───────────────────────────────────────────────────────────────────

function readCSV(filePath) {
  if (!existsSync(filePath)) return [];
  return parse(readFileSync(filePath, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });
}

function readJSON(filePath) {
  if (!existsSync(filePath)) return {};
  try { return JSON.parse(readFileSync(filePath, 'utf-8')); } catch { return {}; }
}

function compositeKey(name, row, matchCols) {
  const parts = matchCols.map(col => String(row[col] || '').trim().toLowerCase());
  return name + '|' + parts.join('|');
}

function extractBrand(manufacturer, name) {
  const cleaned = (manufacturer || '').split(',')[0].trim();
  return cleaned || (name || '').split(' ')[0];
}

function extractSpecs(row, skipCols) {
  const specs = {};
  for (const [col, val] of Object.entries(row)) {
    if (skipCols.has(col)) continue;
    const v = String(val ?? '').trim();
    if (v) specs[col] = v;
  }
  return specs;
}

function buildPriceFallback(dataFile) {
  const data = readJSON(join(DATA_DIR, 'Core Details', 'prices', dataFile));
  const map  = new Map();
  for (const [name, retailers] of Object.entries(data)) {
    let latestTs    = -1;
    let latestPrice = null;
    for (const { data: points } of retailers) {
      for (const [ts, cents] of points) {
        if (cents != null && ts > latestTs) {
          latestTs    = ts;
          latestPrice = Math.round(cents) / 100;
        }
      }
    }
    if (latestPrice != null) map.set(name, latestPrice);
  }
  return map;
}

function buildImageFallback(dataFile) {
  const data = readJSON(join(DATA_DIR, 'Core Details', 'images', dataFile));
  const map  = new Map();
  for (const [name, images] of Object.entries(data)) {
    const src = images?.[0]?.src;
    if (src) map.set(name, src.startsWith('//') ? 'https:' + src : src);
  }
  return map;
}

// ── wipe ──────────────────────────────────────────────────────────────────────

async function clearAll() {
  console.log('Clearing existing component data...');
  await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  await db.ComponentUrl.destroy({ truncate: true });
  await db.ComponentSpec.destroy({ truncate: true });
  await db.BuildComponent.destroy({ truncate: true });
  await db.Component.destroy({ truncate: true });
  await db.Spec.destroy({ truncate: true });
  await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('Cleared.\n');
}

// ── batch insert ──────────────────────────────────────────────────────────────

async function insertBatch(rows) {
  if (rows.length === 0) return 0;

  const created = await db.Component.bulkCreate(
    rows.map(r => ({ name: r.name, type: r.type, brand: r.brand, price: r.price, imageUrl: r.imageUrl }))
  );

  const specRows  = [];
  const specMeta  = [];
  const urlRows   = [];

  for (let j = 0; j < created.length; j++) {
    if (rows[j].url) {
      urlRows.push({ component_id: created[j].id, url: rows[j].url, retailer: 'PCPartPicker' });
    }
    for (const [specName, specValue] of Object.entries(rows[j].specs)) {
      specRows.push({ name: specName, component_id: created[j].id });
      specMeta.push({ componentId: created[j].id, value: specValue });
    }
  }

  if (specRows.length > 0) {
    const createdSpecs = await db.Spec.bulkCreate(specRows);
    await db.ComponentSpec.bulkCreate(
      createdSpecs.map((spec, idx) => ({
        component_id: specMeta[idx].componentId,
        spec_id:      spec.id,
        value:        specMeta[idx].value,
      }))
    );
  }

  if (urlRows.length > 0) await db.ComponentUrl.bulkCreate(urlRows);

  return created.length;
}

// ── seed one type ─────────────────────────────────────────────────────────────

async function seedType({ specFile, type, productFile, dataFile, matchCols }) {
  const productRows = readCSV(join(DATA_DIR, 'Products', 'Core', productFile));
  const specRows    = readCSV(join(DATA_DIR, 'Core Details', 'specs', specFile));
  const priceFb     = buildPriceFallback(dataFile);
  const imageFb     = buildImageFallback(dataFile);

  // Build spec lookup: composite key → spec row, name → first spec row (fallback)
  const specByComp = new Map();
  const specByName = new Map();
  for (const specRow of specRows) {
    const name = (specRow.Name || '').trim();
    if (!name) continue;
    const key = compositeKey(name, specRow, matchCols);
    if (!specByComp.has(key)) specByComp.set(key, specRow);
    if (!specByName.has(name)) specByName.set(name, specRow);
  }

  const toInsert = [];

  // One Component per products CSV row — each URL is a unique product listing
  for (const prodRow of productRows) {
    const name = (prodRow.Name || '').trim();
    if (!name) continue;

    const url      = prodRow.URL || null;
    const img      = prodRow.Image && !prodRow.Image.includes('no-image') ? prodRow.Image : null;
    const price    = parseFloat(prodRow.Price) || null;
    const specRow  = specByComp.get(compositeKey(name, prodRow, matchCols))
                  ?? specByName.get(name)
                  ?? null;

    toInsert.push({
      name,
      type,
      brand:    specRow ? extractBrand(specRow.Manufacturer, name) : name.split(' ')[0],
      price:    price    ?? priceFb.get(name) ?? null,
      imageUrl: img      ?? imageFb.get(name) ?? null,
      url,
      specs:    specRow ? extractSpecs(specRow, SPEC_SKIP) : extractSpecs(prodRow, PROD_SKIP),
    });
  }

  const total = toInsert.length;
  console.log(`[${type}] ${total} rows`);

  let inserted = 0;
  for (let i = 0; i < total; i += BATCH_SIZE) {
    inserted += await insertBatch(toInsert.slice(i, i + BATCH_SIZE));
    const pct = Math.min(100, Math.round(((i + BATCH_SIZE) / total) * 100));
    process.stdout.write(`\r  [${type}] ${inserted}/${total} (${pct}%)`);
  }

  console.log(`\n  [${type}] done — ${inserted} inserted`);
  return inserted;
}

// ── entry point ───────────────────────────────────────────────────────────────

async function seed() {
  try {
    await db.sequelize.authenticate();
    console.log('DB connected.\n');

    if (existsSync(PROGRESS_FILE)) unlinkSync(PROGRESS_FILE);

    await clearAll();

    let total = 0;
    for (const source of SOURCES) {
      total += await seedType(source);
    }

    console.log('\n=============================');
    console.log(`Seeding complete. Total inserted: ${total}`);
  } catch (err) {
    console.error('\nSeeding failed:', err);
    process.exit(1);
  } finally {
    await db.sequelize.close();
  }
}

seed();
