import { readdirSync } from 'fs';
import { basename, dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import Sequelize from 'sequelize';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const env = process.env.NODE_ENV || 'development';
const config = require('../../config/config.cjs')[env];

const db = {};

const sequelize = config.use_env_variable
  ? new Sequelize(process.env[config.use_env_variable], config)
  : new Sequelize(config.database, config.username, config.password, config);

const modelFiles = readdirSync(__dirname).filter(file =>
  file !== basename(__filename) &&
  file.endsWith('.js') &&
  !file.startsWith('.') &&
  !file.endsWith('.test.js')
);

for (const file of modelFiles) {
  const { default: modelDefiner } = await import(pathToFileURL(join(__dirname, file)).href);
  const model = modelDefiner(sequelize, Sequelize.DataTypes);
  db[model.name] = model;
}

Object.values(db).forEach(model => {
  if (model.associate) model.associate(db);
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;
