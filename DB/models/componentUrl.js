export default (sequelize, DataTypes) => {
    const ComponentUrl = sequelize.define('ComponentUrl', {
        url:      { type: DataTypes.TEXT, allowNull: false },
        retailer: { type: DataTypes.TEXT, allowNull: true },
    });

    ComponentUrl.associate = (db) => {
        ComponentUrl.belongsTo(db.Component, {
            foreignKey: { name: 'component_id', allowNull: false },
            onDelete: 'CASCADE',
        });
    };

    return ComponentUrl;
};
