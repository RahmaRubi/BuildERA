import 'dotenv/config';
import { Sequelize } from 'sequelize';
const seq = new Sequelize(process.env.DB_URL, { dialect: 'mysql', logging: false, dialectOptions: { ssl: { rejectUnauthorized: false } } });
try {
  const [meta] = await seq.query('SELECT name FROM SequelizeMeta ORDER BY name');
  console.log('Applied migrations:');
  meta.forEach(r => console.log(' -', r.name));
  const [cols] = await seq.query('SHOW COLUMNS FROM `Components`');
  console.log('\nComponents columns:', cols.map(c => c.Field).join(', '));
} finally {
  await seq.close();
}
