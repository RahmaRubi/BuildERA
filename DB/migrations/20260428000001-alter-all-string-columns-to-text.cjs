'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Builds', 'purpose', { type: Sequelize.TEXT, allowNull: false });

    await queryInterface.changeColumn('Components', 'name',  { type: Sequelize.TEXT, allowNull: false });
    await queryInterface.changeColumn('Components', 'type',  { type: Sequelize.TEXT, allowNull: false });
    await queryInterface.changeColumn('Components', 'brand', { type: Sequelize.TEXT, allowNull: false });

    await queryInterface.changeColumn('Specs', 'name', { type: Sequelize.TEXT, allowNull: false });

    await queryInterface.changeColumn('Users', 'userName', { type: Sequelize.TEXT, allowNull: false });
    await queryInterface.changeColumn('Users', 'email',    { type: Sequelize.TEXT, allowNull: false });
    await queryInterface.changeColumn('Users', 'password', { type: Sequelize.TEXT, allowNull: false });
    await queryInterface.changeColumn('Users', 'phone',    { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.changeColumn('Users', 'role',     { type: Sequelize.TEXT, defaultValue: 'user' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Builds', 'purpose', { type: Sequelize.STRING, allowNull: false });

    await queryInterface.changeColumn('Components', 'name',  { type: Sequelize.STRING, allowNull: false });
    await queryInterface.changeColumn('Components', 'type',  { type: Sequelize.STRING, allowNull: false });
    await queryInterface.changeColumn('Components', 'brand', { type: Sequelize.STRING, allowNull: false });

    await queryInterface.changeColumn('Specs', 'name', { type: Sequelize.STRING, allowNull: false });

    await queryInterface.changeColumn('Users', 'userName', { type: Sequelize.STRING, allowNull: false });
    await queryInterface.changeColumn('Users', 'email',    { type: Sequelize.STRING, allowNull: false });
    await queryInterface.changeColumn('Users', 'password', { type: Sequelize.STRING, allowNull: false });
    await queryInterface.changeColumn('Users', 'phone',    { type: Sequelize.STRING, allowNull: true });
    await queryInterface.changeColumn('Users', 'role',     { type: Sequelize.STRING, defaultValue: 'user' });
  }
};
