export default (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        name: { type: DataTypes.STRING, allowNull: false },
        email: { type: DataTypes.STRING, allowNull: false, unique: true },
        password: { type: DataTypes.STRING, allowNull: false },
        role: { type: DataTypes.STRING, defaultValue: 'user' }
    })
    User.associate = (db) => {
        User.hasMany(db.Build, { foreignKey: { name: 'user_id', allowNull: false }, onDelete: 'CASCADE' })
    }

    return User
}