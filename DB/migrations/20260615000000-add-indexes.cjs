'use strict';

async function addIndexIfMissing(queryInterface, table, fields, options = {}) {
  try {
    await queryInterface.addIndex(table, fields, options);
  } catch (e) {
    if (!e.message.includes('Duplicate key name')) throw e;
  }
}

module.exports = {
  async up(queryInterface) {
    await addIndexIfMissing(queryInterface, 'Builds',          ['user_id']);
    await addIndexIfMissing(queryInterface, 'BuildComponents', ['build_id']);
    await addIndexIfMissing(queryInterface, 'BuildComponents', ['component_id']);
    await addIndexIfMissing(queryInterface, 'ComponentUrls',   ['component_id']);
    await addIndexIfMissing(queryInterface, 'ComponentSpecs',  ['component_id']);
    await addIndexIfMissing(queryInterface, 'ComponentSpecs',  ['spec_id']);
    await addIndexIfMissing(queryInterface, 'Favorites',       ['user_id']);
    await addIndexIfMissing(queryInterface, 'Favorites',       ['component_id']);
    // TEXT columns require a prefix length in MySQL
    await addIndexIfMissing(queryInterface, 'Components', [{ name: 'type',  length: 100 }], { name: 'components_type' });
    await addIndexIfMissing(queryInterface, 'Components', [{ name: 'brand', length: 100 }], { name: 'components_brand' });
    await addIndexIfMissing(queryInterface, 'Components', ['price']);
  },

  async down(queryInterface) {
    // Only remove indexes we actually created (i.e. ones not auto-created by FK constraints)
    const fkAutoIndexed = new Set([
      'builds_user_id',
      'build_components_build_id',
      'build_components_component_id',
      'component_urls_component_id',
      'component_specs_component_id',
      'component_specs_spec_id',
      'favorites_user_id',
      'favorites_component_id',
    ]);

    const allIndexes = [
      ['Builds',          ['user_id']],
      ['BuildComponents', ['build_id']],
      ['BuildComponents', ['component_id']],
      ['ComponentUrls',   ['component_id']],
      ['ComponentSpecs',  ['component_id']],
      ['ComponentSpecs',  ['spec_id']],
      ['Favorites',       ['user_id']],
      ['Favorites',       ['component_id']],
      ['Components',      ['type']],
      ['Components',      ['brand']],
      ['Components',      ['price']],
    ];

    for (const [table, fields] of allIndexes) {
      const indexName = `${table.toLowerCase()}_${fields.join('_')}`;
      if (fkAutoIndexed.has(indexName)) continue;
      try {
        await queryInterface.removeIndex(table, fields);
      } catch (_) {}
    }
  },
};
