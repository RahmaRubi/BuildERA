export default (sequelize, DataTypes) => {
    const Build = sequelize.define('Build', {
        budget: {
            type: DataTypes.FLOAT,
            allowNull: false
        },
        purpose: {
            type: DataTypes.TEXT,
            allowNull: false
        }
    })

    Build.associate = (db) => {
        Build.belongsTo(db.User, { foreignKey: { name: 'user_id', allowNull: false } })
        Build.hasMany(db.BuildComponent, { foreignKey: { name: 'build_id', allowNull: false }, onDelete: 'CASCADE' })
    }

    return Build
}
