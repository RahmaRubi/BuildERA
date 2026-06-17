import 'dotenv/config';
import db from '../models/index.js';

await db.sequelize.authenticate();

// 1. Find ComponentSpecs that reference deleted components
const [orphanCS] = await db.sequelize.query(
  'SELECT id, spec_id FROM ComponentSpecs WHERE component_id NOT IN (SELECT id FROM Components)'
);
console.log(`Orphaned ComponentSpecs: ${orphanCS.length}`);

if (orphanCS.length > 0) {
  const csIds   = orphanCS.map(r => r.id);
  const specIds = [...new Set(orphanCS.map(r => r.spec_id))];

  // Delete orphaned ComponentSpecs
  await db.sequelize.query(
    `DELETE FROM ComponentSpecs WHERE id IN (${csIds.join(',')})`
  );
  console.log(`Deleted ${csIds.length} orphaned ComponentSpecs`);

  // Delete Specs that are no longer referenced by any ComponentSpec
  if (specIds.length > 0) {
    await db.sequelize.query(
      `DELETE FROM Specs WHERE id IN (${specIds.join(',')}) AND id NOT IN (SELECT spec_id FROM ComponentSpecs)`
    );
    console.log(`Deleted orphaned Specs`);
  }
}

// Final counts
const [compCount]  = await db.sequelize.query('SELECT COUNT(*) as cnt FROM Components');
const [urlCount]   = await db.sequelize.query('SELECT COUNT(*) as cnt FROM ComponentUrls');
const [specCount]  = await db.sequelize.query('SELECT COUNT(*) as cnt FROM Specs');

console.log('\n=== Final DB counts ===');
console.log('Components:    ', compCount[0].cnt);
console.log('ComponentUrls: ', urlCount[0].cnt);
console.log('Specs:         ', specCount[0].cnt);

await db.sequelize.close();
