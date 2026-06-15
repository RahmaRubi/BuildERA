import 'dotenv/config';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from '../models/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = join(__dirname, '../../seeders/data/Core Details/images');

const SOURCES = [
  { type: 'CPU',          dataFile: 'Core_CPUs.json'          },
  { type: 'Motherboard',  dataFile: 'Core_Motherboards.json'  },
  { type: 'Memory',       dataFile: 'Core_Memory.json'        },
  { type: 'Video Card',   dataFile: 'Core_Video Cards.json'   },
  { type: 'Case',         dataFile: 'Core_Cases.json'         },
  { type: 'Power Supply', dataFile: 'Core_Power Supplies.json'},
  { type: 'CPU Cooler',   dataFile: 'Core_CPU Coolers.json'   },
  { type: 'Storage',      dataFile: 'Core_Storage.json'       },
];

function loadImageMap(dataFile) {
  const path = join(IMAGES_DIR, dataFile);
  if (!existsSync(path)) return new Map();
  const data = JSON.parse(readFileSync(path, 'utf-8'));
  const map = new Map();
  for (const [name, images] of Object.entries(data)) {
    const src = images?.[0]?.src;
    if (src) map.set(name, src.startsWith('//') ? 'https:' + src : src);
  }
  return map;
}

async function patch() {
  await db.sequelize.authenticate();
  console.log('DB connected.\n');

  let totalFixed = 0;

  for (const { type, dataFile } of SOURCES) {
    const imageMap = loadImageMap(dataFile);

    const components = await db.Component.findAll({
      where: db.sequelize.literal(
        `type = ${db.sequelize.escape(type)} AND (imageUrl IS NULL OR imageUrl LIKE '%no-image%')`
      ),
      attributes: ['id', 'name', 'imageUrl'],
    });

    if (components.length === 0) {
      console.log(`[${type}] no broken images — skipping`);
      continue;
    }

    let fixed = 0;
    for (const component of components) {
      const newImage = imageMap.get(component.name);
      if (!newImage) continue;
      await component.update({ imageUrl: newImage });
      fixed++;
    }

    console.log(`[${type}] ${fixed}/${components.length} fixed`);
    totalFixed += fixed;
  }

  console.log(`\nDone. Total updated: ${totalFixed}`);
  await db.sequelize.close();
}

patch().catch(err => {
  console.error('Patch failed:', err);
  process.exit(1);
});
