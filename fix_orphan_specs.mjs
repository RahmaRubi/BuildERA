import 'dotenv/config';
import { Sequelize } from 'sequelize';

const seq = new Sequelize(process.env.DB_URL, {
  dialect: 'mysql',
  logging: false,
  dialectOptions: { ssl: { rejectUnauthorized: false } },
});

const BATCH = 10000;

async function countOrphans() {
  const [[{ orphanCS }]] = await seq.query(`
    SELECT COUNT(*) as orphanCS
    FROM \`ComponentSpecs\` cs
    LEFT JOIN \`Components\` c ON c.id = cs.component_id
    WHERE c.id IS NULL
  `);
  const [[{ orphanS }]] = await seq.query(`
    SELECT COUNT(*) as orphanS
    FROM \`Specs\` s
    WHERE NOT EXISTS (
      SELECT 1 FROM \`ComponentSpecs\` cs
      INNER JOIN \`Components\` c ON c.id = cs.component_id
      WHERE cs.spec_id = s.id
    )
  `);
  return { orphanCS: Number(orphanCS), orphanS: Number(orphanS) };
}

async function deleteInBatches(label, fetchSql, deleteSql) {
  let total = 0;
  while (true) {
    const [rows] = await seq.query(fetchSql);
    if (rows.length === 0) break;
    const ids = rows.map(r => r.id);
    const [, meta] = await seq.query(deleteSql, { replacements: { ids } });
    const affected = meta?.affectedRows ?? 0;
    total += affected;
    process.stdout.write(`\r  [${label}] deleted ${total} rows...`);
  }
  console.log();
  return total;
}

async function main() {
  await seq.authenticate();
  console.log('Connected.\n');

  // --- Dry run ---
  console.log('Counting orphans...');
  const before = await countOrphans();
  console.log(`  Orphaned ComponentSpecs : ${before.orphanCS.toLocaleString()}`);
  console.log(`  Orphaned Specs (preview): ${before.orphanS.toLocaleString()} (will grow after step 1)`);

  if (before.orphanCS === 0) {
    console.log('\nNothing to clean up.');
    return;
  }

  // --- Step 1: delete orphaned ComponentSpecs ---
  console.log('\nStep 1: Deleting orphaned ComponentSpecs...');
  const deletedCS = await deleteInBatches(
    'ComponentSpecs',
    `SELECT cs.id FROM \`ComponentSpecs\` cs
     LEFT JOIN \`Components\` c ON c.id = cs.component_id
     WHERE c.id IS NULL
     LIMIT ${BATCH}`,
    `DELETE FROM \`ComponentSpecs\` WHERE id IN (:ids)`
  );
  console.log(`  Done — ${deletedCS.toLocaleString()} rows deleted.`);

  // --- Step 2: delete Specs now orphaned (no remaining ComponentSpec references) ---
  console.log('\nStep 2: Deleting Specs no longer referenced by any ComponentSpec...');
  const deletedS = await deleteInBatches(
    'Specs',
    `SELECT s.id FROM \`Specs\` s
     LEFT JOIN \`ComponentSpecs\` cs ON cs.spec_id = s.id
     WHERE cs.id IS NULL
     LIMIT ${BATCH}`,
    `DELETE FROM \`Specs\` WHERE id IN (:ids)`
  );
  console.log(`  Done — ${deletedS.toLocaleString()} rows deleted.`);

  // --- Verify ---
  console.log('\nVerifying...');
  const [[{ totalCS }]] = await seq.query('SELECT COUNT(*) as totalCS FROM `ComponentSpecs`');
  const [[{ totalS  }]] = await seq.query('SELECT COUNT(*) as totalS  FROM `Specs`');
  const after = await countOrphans();

  console.log(`  ComponentSpecs remaining : ${Number(totalCS).toLocaleString()}`);
  console.log(`  Specs remaining          : ${Number(totalS).toLocaleString()}`);
  console.log(`  Orphaned ComponentSpecs  : ${after.orphanCS}`);
  console.log(`  Orphaned Specs           : ${after.orphanS}`);
  console.log(after.orphanCS === 0 && after.orphanS === 0 ? '\nAll clean!' : '\nWarning: orphans remain.');
}

main().catch(console.error).finally(() => seq.close());
