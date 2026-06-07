import Sequelize from 'sequelize';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import defineUser           from './user.js';
import defineBuild          from './build.js';
import defineBuildComponent from './buildComponent.js';
import defineComponent      from './component.js';
import defineComponentSpec  from './componentSpec.js';
import defineSpec           from './spec.js';

const require   = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const env    = process.env.NODE_ENV || 'development';
const config = require('../../config/config.cjs')[env];

const db = {};

const sequelize = config.use_env_variable
  ? new Sequelize(process.env[config.use_env_variable], config)
  : new Sequelize(config.database, config.username, config.password, config);

const modelDefiners = [
  defineUser,
  defineBuild,
  defineBuildComponent,
  defineComponent,
  defineComponentSpec,
  defineSpec,
];

for (const definer of modelDefiners) {
  const model = definer(sequelize, Sequelize.DataTypes);
  db[model.name] = model;
}

Object.values(db).forEach(model => {
  if (model.associate) model.associate(db);
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;
