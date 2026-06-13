import 'dotenv/config';
import db from './DB/models/index.js';

await db.sequelize.authenticate();
const [types] = await db.sequelize.query('SELECT type, COUNT(*) as cnt FROM Components GROUP BY type ORDER BY type');
console.log('Component types in DB:');
types.forEach(r => console.log(`  ${r.type}: ${r.cnt}`));
const [specCnt] = await db.sequelize.query('SELECT COUNT(*) as cnt FROM Specs');
const [csCnt] = await db.sequelize.query('SELECT COUNT(*) as cnt FROM ComponentSpecs');
console.log(`\nSpecs: ${specCnt[0].cnt}, ComponentSpecs: ${csCnt[0].cnt}`);
await db.sequelize.close();
