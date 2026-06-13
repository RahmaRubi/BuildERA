import 'dotenv/config';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Op } from 'sequelize';
import db from './DB/models/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROGRESS_FILE = join(__dirname, 'seeders/progress.json');

const ACCESSORY_TYPES = [
  'Operating System',
  'Case Accessory',
  'Case Fan',
  'External Storage',
  'Fan Controller',
  'Optical Drive',
  'Thermal Compound',
  'UPS System',
  'Sound Card',
  'Wired Network Adapter',
  'Wireless Network Adapter',
  'Headphones',
  'Keyboard',
  'Mouse',
  'Speakers',
  'Webcam',
];

try {
  await db.sequelize.authenticate();
  console.log('DB connected.\n');

  const deleted = await db.Component.destroy({
    where: { type: { [Op.in]: ACCESSORY_TYPES } },
  });
  

  console.log(`Deleted ${deleted} accessory/peripheral components (specs cascade-deleted).`);

  if (existsSync(PROGRESS_FILE)) {
    const progress = JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'));
    delete progress.peripheralsDone;
    writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
    console.log('progress.json cleaned up.');
  }
} catch (err) {
  console.error('Cleanup failed:', err.message);
  process.exit(1);
} finally {
  await db.sequelize.close();
}
