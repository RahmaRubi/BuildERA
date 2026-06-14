'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ComponentUrls', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      component_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Components', key: 'id' },
        onDelete: 'CASCADE',
      },
      url: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      retailer: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // Migrate existing single URLs from Components.url into ComponentUrls
    await queryInterface.sequelize.query(`
      INSERT INTO ComponentUrls (component_id, url, createdAt, updatedAt)
      SELECT id, url, NOW(), NOW()
      FROM Components
      WHERE url IS NOT NULL AND url != ''
    `);

    await queryInterface.removeColumn('Components', 'url');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('Components', 'url', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    // Restore one URL per component (pick the first one)
    await queryInterface.sequelize.query(`
      UPDATE Components c
      JOIN (SELECT component_id, MIN(url) AS url FROM ComponentUrls GROUP BY component_id) cu
        ON c.id = cu.component_id
      SET c.url = cu.url
    `);

    await queryInterface.dropTable('ComponentUrls');
  },
};
