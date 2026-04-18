import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { Sequelize } from 'sequelize';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sequelize = new Sequelize(process.env.DB_URL, {
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

const DATA_DIR = path.join(__dirname, 'data');

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

async function seedComponents() {
  console.log('\n--- Seeding Components ---');
  const csvFiles = getAllProductCSVs();
  let total = 0;

  for (const { filePath, type } of csvFiles) {
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
      await sequelize.getQueryInterface().bulkInsert('Components', records);
      console.log(`  [${type}] inserted ${records.length} components`);
      total += records.length;
    }
  }

  console.log(`Total components inserted: ${total}`);
}

async function seedSpecs() {
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
    const rows = readCSV(filePath);
    if (rows.length === 0) continue;

    const specColumns = Object.keys(rows[0]).filter(
      col => col !== 'Name' && col !== 'Model'
    );

    const typeMap = componentMap[type] || {};
    const now = new Date();

    // Build all Spec records for the entire file at once
    const allSpecRecords = [];
    for (const row of rows) {
      const componentId = typeMap[row['Name']?.trim()];
      if (!componentId) continue;
      for (const specName of specColumns) {
        allSpecRecords.push({ name: specName, component_id: componentId, createdAt: now, updatedAt: now });
      }
    }

    if (allSpecRecords.length === 0) continue;

    // One INSERT for all Specs, get back IDs with RETURNING
    const insertedSpecs = await sequelize.query(
      `INSERT INTO "Specs" (name, component_id, "createdAt", "updatedAt")
       VALUES ${allSpecRecords.map(() => '(?, ?, ?, ?)').join(', ')}
       RETURNING id, name, component_id`,
      {
        replacements: allSpecRecords.flatMap(r => [r.name, r.component_id, r.createdAt, r.updatedAt]),
        type: Sequelize.QueryTypes.INSERT
      }
    );

    // Build lookup: component_id → { specName → specId }
    const specIdMap = {};
    for (const s of insertedSpecs[0]) {
      if (!specIdMap[s.component_id]) specIdMap[s.component_id] = {};
      specIdMap[s.component_id][s.name] = s.id;
    }

    // Build all ComponentSpec records for the entire file at once
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

    // One INSERT for all ComponentSpecs
    if (allComponentSpecRecords.length > 0) {
      await sequelize.getQueryInterface().bulkInsert('ComponentSpecs', allComponentSpecRecords);
    }

    console.log(`  [${type}] specs: ${allSpecRecords.length}, componentSpecs: ${allComponentSpecRecords.length}`);
  }
}

async function main() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.');

    await seedComponents();
    await seedSpecs();

    console.log('\nSeeding complete!');
  } catch (err) {
    console.error('Error during seeding:', err.message);
  } finally {
    await sequelize.close();
  }
}

main();
