export default (sequelize, DataTypes) => {
    const Favorite = sequelize.define('Favorite', {
        user_id:      { type: DataTypes.INTEGER, allowNull: false },
        component_id: { type: DataTypes.INTEGER, allowNull: false },
    });

    Favorite.associate = (db) => {
        Favorite.belongsTo(db.User,      { foreignKey: 'user_id',      onDelete: 'CASCADE' });
        Favorite.belongsTo(db.Component, { foreignKey: 'component_id', onDelete: 'CASCADE' });
    };

    return Favorite;
};
