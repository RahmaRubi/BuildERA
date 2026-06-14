'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Builds', 'budget', {
      type: Sequelize.FLOAT,
      allowNull: true,
      defaultValue: null,
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Builds', 'budget', {
      type: Sequelize.FLOAT,
      allowNull: false,
    });
  },
};
