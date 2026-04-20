export default (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        userName: { type: DataTypes.STRING, allowNull: false },
        email: { type: DataTypes.STRING, allowNull: false, unique: true },
        password: { type: DataTypes.STRING, allowNull: false },
        phone: { type: DataTypes.STRING },
        role: { type: DataTypes.STRING, defaultValue: 'user' },
        isConfirmed: { type: DataTypes.BOOLEAN, defaultValue: false },
        isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
        deletedAt: { type: DataTypes.DATE, allowNull: true },
    }, { paranoid: false })
    User.associate = (db) => {
        User.hasMany(db.Build, { foreignKey: { name: 'user_id', allowNull: false }, onDelete: 'CASCADE' })
    }

    return User
}