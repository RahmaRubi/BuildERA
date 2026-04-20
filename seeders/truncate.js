import 'dotenv/config';
import { Sequelize } from 'sequelize';

const sequelize = new Sequelize(process.env.DB_URL, {
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

try {
  await sequelize.authenticate();
  await sequelize.query('TRUNCATE "ComponentSpecs", "Specs", "Components" CASCADE');
  console.log('Tables truncated successfully.');
} catch (err) {
  console.error('Error:', err.message);
} finally {
  await sequelize.close();
}
