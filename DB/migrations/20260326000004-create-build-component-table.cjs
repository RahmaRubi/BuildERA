'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('BuildComponents', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      build_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Builds', key: 'id' },
        onDelete: 'CASCADE'
      },
      component_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Components', key: 'id' },
        onDelete: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('BuildComponents');
  }
};
