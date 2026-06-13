import 'dotenv/config';
import { Sequelize } from 'sequelize';
const seq = new Sequelize(process.env.DB_URL, { dialect: 'mysql', logging: false, dialectOptions: { ssl: { rejectUnauthorized: false } } });
try {
  const [cols] = await seq.query("SHOW COLUMNS FROM `Components` LIKE 'url'");
  if (cols.length > 0) {
    console.log('url column already exists — nothing to do.');
  } else {
    await seq.query('ALTER TABLE `Components` ADD COLUMN `url` LONGTEXT NULL');
    console.log('url column added successfully.');
  }
} finally {
  await seq.close();
}
