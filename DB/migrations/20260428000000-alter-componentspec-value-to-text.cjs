'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('ComponentSpecs', 'value', {
      type: Sequelize.TEXT,
      allowNull: false
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('ComponentSpecs', 'value', {
      type: Sequelize.STRING,
      allowNull: false
    });
  }
};
