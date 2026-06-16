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

const SKIP_COLS = new Set(['Name', 'Manufacturer', 'Part #', 'Model', 'URL']);

const SOURCES = [
  { specFile: 'Core_CPUs.csv',           type: 'CPU',          productFile: 'CPUs.csv',           dataFile: 'Core_CPUs.json'           },
  { specFile: 'Core_Motherboards.csv',   type: 'Motherboard',  productFile: 'Motherboards.csv',   dataFile: 'Core_Motherboards.json'   },
  { specFile: 'Core_Memory.csv',         type: 'Memory',       productFile: 'Memory.csv',         dataFile: 'Core_Memory.json'         },
  { specFile: 'Core_Video Cards.csv',    type: 'Video Card',   productFile: 'Video Cards.csv',    dataFile: 'Core_Video Cards.json'    },
  { specFile: 'Core_Cases.csv',          type: 'Case',         productFile: 'Cases.csv',          dataFile: 'Core_Cases.json'          },
  { specFile: 'Core_Power Supplies.csv', type: 'Power Supply', productFile: 'Power Supplies.csv', dataFile: 'Core_Power Supplies.json' },
  { specFile: 'Core_CPU Coolers.csv',    type: 'CPU Cooler',   productFile: 'CPU Coolers.csv',    dataFile: 'Core_CPU Coolers.json'    },
  { specFile: 'Core_Storage.csv',        type: 'Storage',      productFile: 'Storage.csv',        dataFile: 'Core_Storage.json'        },
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

// Products CSV → url: { price, imageUrl }
function buildProductLookup(productFile) {
  const rows = readCSV(join(DATA_DIR, 'Products', 'Core', productFile));
  const map  = new Map();
  for (const row of rows) {
    const url = (row.URL || '').trim();
    if (!url) continue;
    const img = row.Image && !row.Image.includes('no-image') ? row.Image : null;
    map.set(url, {
      price:    parseFloat(row.Price) || null,
      imageUrl: img,
    });
  }
  return map;
}

// prices JSON → name: most-recent non-null price in dollars
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

// images JSON → name: first image src (https-prefixed)
function buildImageFallback(dataFile) {
  const data = readJSON(join(DATA_DIR, 'Core Details', 'images', dataFile));
  const map  = new Map();
  for (const [name, images] of Object.entries(data)) {
    const src = images?.[0]?.src;
    if (src) map.set(name, src.startsWith('//') ? 'https:' + src : src);
  }
  return map;
}

function extractBrand(manufacturer, name) {
  const cleaned = (manufacturer || '').split(',')[0].trim();
  return cleaned || (name || '').split(' ')[0];
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

// ── seed one type ─────────────────────────────────────────────────────────────

async function seedType({ specFile, type, productFile, dataFile }) {
  const specRows  = readCSV(join(DATA_DIR, 'Core Details', 'specs', specFile));
  const products  = buildProductLookup(productFile);
  const priceFb   = buildPriceFallback(dataFile);
  const imageFb   = buildImageFallback(dataFile);

  const total = specRows.length;
  console.log(`[${type}] ${total} rows`);

  let inserted = 0;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch         = specRows.slice(i, i + BATCH_SIZE);
    const componentData = [];
    const specData      = [];
    const urlData       = [];

    for (const row of batch) {
      const name    = (row.Name || '').trim();
      const specUrl = (row.URL  || '').trim();
      if (!name) continue;

      const product  = products.get(specUrl);
      const price    = product?.price    ?? priceFb.get(name) ?? null;
      const imageUrl = product?.imageUrl ?? imageFb.get(name) ?? null;

      const specs = {};
      for (const [col, val] of Object.entries(row)) {
        if (SKIP_COLS.has(col)) continue;
        const v = String(val ?? '').trim();
        if (v) specs[col] = v;
      }

      componentData.push({ name, type, brand: extractBrand(row.Manufacturer, name), price, imageUrl });
      specData.push(specs);
      urlData.push(specUrl);
    }

    if (componentData.length === 0) continue;

    const created = await db.Component.bulkCreate(componentData);

    // Specs + ComponentSpecs
    const newSpecRows = [];
    const specMeta    = [];
    for (let j = 0; j < created.length; j++) {
      for (const [specName, specValue] of Object.entries(specData[j])) {
        newSpecRows.push({ name: specName, component_id: created[j].id });
        specMeta.push({ componentId: created[j].id, value: specValue });
      }
    }
    if (newSpecRows.length > 0) {
      const createdSpecs = await db.Spec.bulkCreate(newSpecRows);
      await db.ComponentSpec.bulkCreate(
        createdSpecs.map((spec, idx) => ({
          component_id: specMeta[idx].componentId,
          spec_id:      spec.id,
          value:        specMeta[idx].value,
        }))
      );
    }

    // URLs (PCPartPicker)
    const urlRecords = [];
    for (let j = 0; j < created.length; j++) {
      if (urlData[j]) {
        urlRecords.push({ component_id: created[j].id, url: urlData[j], retailer: 'PCPartPicker' });
      }
    }
    if (urlRecords.length > 0) await db.ComponentUrl.bulkCreate(urlRecords);

    inserted += componentData.length;
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
