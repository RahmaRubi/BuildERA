export default (sequelize, DataTypes) => {
    const Build = sequelize.define('Build', {
        name: {
            type: DataTypes.STRING,
            allowNull: true
        },
        budget: {
            type: DataTypes.FLOAT,
            allowNull: false
        },
        purpose: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        shareToken: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true
        }
    })

    Build.associate = (db) => {
        Build.belongsTo(db.User, { foreignKey: { name: 'user_id', allowNull: false } })
        Build.hasMany(db.BuildComponent, { foreignKey: { name: 'build_id', allowNull: false }, onDelete: 'CASCADE' })
    }

    return Build
}
