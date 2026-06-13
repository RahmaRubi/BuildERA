import 'dotenv/config';
import db from '../models/index.js';

const CORE_TYPES = new Set([
  'CPU', 'Motherboard', 'Memory', 'Video Card',
  'Case', 'Power Supply', 'CPU Cooler', 'Storage',
]);

async function cleanup() {
  try {
    await db.sequelize.authenticate();
    console.log('DB connected.\n');

    // Find all non-core component IDs (includes Monitor + all accessories)
    const nonCore = await db.Component.findAll({
      attributes: ['id', 'type'],
      where: { type: { [db.Sequelize.Op.notIn]: [...CORE_TYPES] } },
    });

    if (nonCore.length === 0) {
      console.log('Nothing to clean up — no non-core components found.');
      return;
    }

    // Group by type for reporting
    const byType = {};
    for (const c of nonCore) {
      byType[c.type] = (byType[c.type] || 0) + 1;
    }
    console.log('Non-core components found:');
    for (const [type, count] of Object.entries(byType)) {
      console.log(`  ${type}: ${count}`);
    }

    const ids = nonCore.map(c => c.id);

    // Delete Specs and ComponentSpecs first (in case CASCADE isn't active via FK)
    const csDeleted = await db.ComponentSpec.destroy({ where: { component_id: ids } });
    const sDeleted  = await db.Spec.destroy({ where: { component_id: ids } });
    const cDeleted  = await db.Component.destroy({ where: { id: ids } });

    console.log(`\nDeleted: ${cDeleted} components, ${sDeleted} specs, ${csDeleted} component_specs`);
    console.log('Cleanup complete.');
  } catch (err) {
    console.error('Cleanup failed:', err.message);
    process.exit(1);
  } finally {
    await db.sequelize.close();
  }
}

cleanup();
