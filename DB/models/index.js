import Sequelize from 'sequelize';
import mysql2 from 'mysql2';

import defineUser           from './user.js';
import defineBuild          from './build.js';
import defineBuildComponent from './buildComponent.js';
import defineComponent      from './component.js';
import defineComponentSpec  from './componentSpec.js';
import defineSpec           from './spec.js';

const db = {};

const sequelize = new Sequelize(process.env.DB_URL, {
  dialect: 'mysql',
  dialectModule: mysql2,
  dialectOptions: {
    ssl: { rejectUnauthorized: false }
  },
  logging: false,
});

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
