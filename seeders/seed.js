import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { Sequelize } from 'sequelize';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sequelize = new Sequelize(process.env.DB_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false },
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  },
  pool: { max: 1, min: 0, acquire: 300000, idle: 600000 },
  logging: false
});

const DATA_DIR = path.join(__dirname, 'data');
const PROGRESS_FILE = path.join(__dirname, 'progress.json');

const FILE_TYPE_MAP = {
  'CPUs.csv':                      'CPU',
  'CPU Coolers.csv':               'CPU Cooler',
  'Motherboards.csv':              'Motherboard',
  'Memory.csv':                    'Memory',
  'Storage.csv':                   'Storage',
  'Video Cards.csv':               'Video Card',
  'Cases.csv':                     'Case',
  'Power Supplies.csv':            'Power Supply',
  'Operating Systems.csv':         'Operating System',
  'Monitors.csv':                  'Monitor',
  'Case Accessories.csv':          'Case Accessory',
  'Case Fans.csv':                 'Case Fan',
  'Fan Controllers.csv':           'Fan Controller',
  'Thermal Compound.csv':          'Thermal Compound',
  'External Storage.csv':          'External Storage',
  'Optical Drives.csv':            'Optical Drive',
  'UPS Systems.csv':               'UPS System',
  'Sound Cards.csv':               'Sound Card',
  'Wired Network Adapters.csv':    'Wired Network Adapter',
  'Wireless Network Adapters.csv': 'Wireless Network Adapter',
  'Headphones.csv':                'Headphones',
  'Keyboards.csv':                 'Keyboard',
  'Mice.csv':                      'Mouse',
  'Speakers.csv':                  'Speakers',
  'Webcams.csv':                   'Webcam',
};

const SPEC_FILE_TYPE_MAP = {
  'Core_CPUs.csv':           'CPU',
  'Core_CPU Coolers.csv':    'CPU Cooler',
  'Core_Motherboards.csv':   'Motherboard',
  'Core_Memory.csv':         'Memory',
  'Core_Storage.csv':        'Storage',
  'Core_Video Cards.csv':    'Video Card',
  'Core_Cases.csv':          'Case',
  'Core_Power Supplies.csv': 'Power Supply',
  'Core_Monitors.csv':       'Monitor',
};

// --- Progress checkpoint ---

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  }
  return { components: [], specs: [] };
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// --- Helpers ---

function extractBrand(name) {
  return name.split(' ')[0] || 'Unknown';
}

function parsePrice(raw) {
  if (!raw || raw.trim() === '') return 0;
  const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
  return isNaN(num) ? 0 : num;
}

function readCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parse(content, { columns: true, skip_empty_lines: true, trim: true });
}

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

async function withRetry(fn, retries = 8, delayMs = 5000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      const wait = delayMs * attempt;
      console.log(`\n  Connection lost. Waiting ${wait}ms then retrying (${attempt}/${retries})...`);
      await new Promise(r => setTimeout(r, wait));
      try { await sequelize.authenticate(); } catch (_) {}
    }
  }
}

function getAllProductCSVs() {
  const results = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.csv') && FILE_TYPE_MAP[entry.name]) {
        results.push({ filePath: fullPath, type: FILE_TYPE_MAP[entry.name] });
      }
    }
  }
  walk(path.join(DATA_DIR, 'Products'));
  return results;
}

function getAllSpecCSVs() {
  const results = [];
  const specsDir = path.join(DATA_DIR, 'Core Details', 'specs');
  for (const entry of fs.readdirSync(specsDir, { withFileTypes: true })) {
    if (entry.name.endsWith('.csv') && SPEC_FILE_TYPE_MAP[entry.name]) {
      results.push({
        filePath: path.join(specsDir, entry.name),
        type: SPEC_FILE_TYPE_MAP[entry.name]
      });
    }
  }
  return results;
}

// --- Seeding ---

async function seedComponents(progress) {
  console.log('\n--- Seeding Components ---');
  const csvFiles = getAllProductCSVs();
  let total = 0;

  for (const { filePath, type } of csvFiles) {
    if (progress.components.includes(type)) {
      console.log(`  [${type}] already done, skipping.`);
      continue;
    }

    // Clean up any partial insert from a previous crashed attempt
    await sequelize.query(`DELETE FROM "Components" WHERE type = :type`, {
      replacements: { type }
    });

    const rows = readCSV(filePath);
    const now = new Date();
    const records = rows.map(row => ({
      name:      row['Name'],
      type:      type,
      brand:     extractBrand(row['Name']),
      price:     parsePrice(row['Price']),
      createdAt: now,
      updatedAt: now
    }));

    if (records.length > 0) {
      await withRetry(() => sequelize.getQueryInterface().bulkInsert('Components', records));
      console.log(`  [${type}] inserted ${records.length} components`);
      total += records.length;
    }

    progress.components.push(type);
    saveProgress(progress);
  }

  console.log(`Total components inserted: ${total}`);
}

async function seedSpecs(progress) {
  console.log('\n--- Seeding Specs & ComponentSpecs ---');
  const csvFiles = getAllSpecCSVs();

  const allComponents = await sequelize.query(
    `SELECT id, name, type FROM "Components"`,
    { type: Sequelize.QueryTypes.SELECT }
  );

  const componentMap = {};
  for (const comp of allComponents) {
    if (!componentMap[comp.type]) componentMap[comp.type] = {};
    componentMap[comp.type][comp.name.trim()] = comp.id;
  }

  for (const { filePath, type } of csvFiles) {
    if (progress.specs.includes(type)) {
      console.log(`  [${type}] specs already done, skipping.`);
      continue;
    }

    // Clean up any partial specs/componentspecs from a previous crashed attempt
    // Only do full cleanup if we have no saved chunk progress (i.e. fresh start for this type)
    const componentIds = Object.values(componentMap[type] || {});
    const csProgressKey = `specs_cs_chunk_${type}`;
    if (componentIds.length > 0 && !progress[csProgressKey]) {
      await sequelize.query(
        `DELETE FROM "ComponentSpecs" WHERE component_id IN (:ids)`,
        { replacements: { ids: componentIds } }
      );
      await sequelize.query(
        `DELETE FROM "Specs" WHERE component_id IN (:ids)`,
        { replacements: { ids: componentIds } }
      );
    }

    const rows = readCSV(filePath);
    if (rows.length === 0) continue;

    const specColumns = Object.keys(rows[0]).filter(
      col => col !== 'Name' && col !== 'Model'
    );

    const typeMap = componentMap[type] || {};
    const now = new Date();

    // Build all Spec records
    const allSpecRecords = [];
    for (const row of rows) {
      const componentId = typeMap[row['Name']?.trim()];
      if (!componentId) continue;
      for (const specName of specColumns) {
        allSpecRecords.push({ name: specName, component_id: componentId, createdAt: now, updatedAt: now });
      }
    }

    if (allSpecRecords.length === 0) continue;

    // INSERT Specs in chunks, get IDs back via RETURNING
    const specIdMap = {};
    const specChunks = chunk(allSpecRecords, 300);
    for (let i = 0; i < specChunks.length; i++) {
      process.stdout.write(`\r  [${type}] Specs: chunk ${i + 1}/${specChunks.length}   `);
      const result = await withRetry(() => sequelize.query(
        `INSERT INTO "Specs" (name, component_id, "createdAt", "updatedAt")
         VALUES ${specChunks[i].map(() => '(?, ?, ?, ?)').join(', ')}
         RETURNING id, name, component_id`,
        {
          replacements: specChunks[i].flatMap(r => [r.name, r.component_id, r.createdAt, r.updatedAt]),
          type: Sequelize.QueryTypes.INSERT
        }
      ));
      for (const s of result[0]) {
        if (!specIdMap[s.component_id]) specIdMap[s.component_id] = {};
        specIdMap[s.component_id][s.name] = s.id;
      }
    }
    console.log();

    // Build all ComponentSpec records
    const allComponentSpecRecords = [];
    for (const row of rows) {
      const componentId = typeMap[row['Name']?.trim()];
      if (!componentId || !specIdMap[componentId]) continue;
      for (const specName of specColumns) {
        const specId = specIdMap[componentId][specName];
        if (specId) {
          allComponentSpecRecords.push({ value: row[specName] ?? '', component_id: componentId, spec_id: specId, createdAt: now, updatedAt: now });
        }
      }
    }

    // INSERT ComponentSpecs in chunks, resuming from last saved chunk
    const csChunks = chunk(allComponentSpecRecords, 300);
    const startChunk = progress[csProgressKey] || 0;

    if (startChunk > 0) {
      console.log(`  [${type}] Resuming ComponentSpecs from chunk ${startChunk + 1}/${csChunks.length}`);
    }

    for (let i = startChunk; i < csChunks.length; i++) {
      process.stdout.write(`\r  [${type}] ComponentSpecs: chunk ${i + 1}/${csChunks.length}   `);
      await withRetry(() => sequelize.getQueryInterface().bulkInsert('ComponentSpecs', csChunks[i]));
      progress[csProgressKey] = i + 1;
      saveProgress(progress);
    }
    console.log();

    delete progress[csProgressKey];

    console.log(`  [${type}] done — specs: ${allSpecRecords.length}, componentSpecs: ${allComponentSpecRecords.length}`);

    progress.specs.push(type);
    saveProgress(progress);
  }
}

async function main() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.');

    const progress = loadProgress();

    if (progress.components.length > 0 || progress.specs.length > 0) {
      console.log(`Resuming from checkpoint — components done: [${progress.components.join(', ')}]`);
      console.log(`                         — specs done:      [${progress.specs.join(', ')}]`);
    }

    await seedComponents(progress);
    await seedSpecs(progress);

    console.log('\nSeeding complete!');

    // Clean up checkpoint on success
    if (fs.existsSync(PROGRESS_FILE)) fs.unlinkSync(PROGRESS_FILE);

  } catch (err) {
    console.error('Error during seeding:', err.message);
    console.log('Progress saved. Re-run seed.js to resume from where it stopped.');
  } finally {
    await sequelize.close();
  }
}

main();
