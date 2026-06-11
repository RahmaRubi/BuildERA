export default (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        userName: { type: DataTypes.TEXT, allowNull: false },
        email: { type: DataTypes.STRING, allowNull: false, unique: true },
        password: { type: DataTypes.TEXT, allowNull: false },
        role: { type: DataTypes.TEXT, defaultValue: 'user' },
        isConfirmed: { type: DataTypes.BOOLEAN, defaultValue: false },
        imageUrl:  { type: DataTypes.TEXT, allowNull: true },
        isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
        deletedAt: { type: DataTypes.DATE, allowNull: true },
    }, { paranoid: false })
    User.associate = (db) => {
        User.hasMany(db.Build,    { foreignKey: { name: 'user_id', allowNull: false }, onDelete: 'CASCADE' });
        User.hasMany(db.Favorite, { foreignKey: 'user_id', onDelete: 'CASCADE' });
    }

    return User
}