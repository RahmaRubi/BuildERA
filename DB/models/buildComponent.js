export default (sequelize, DataTypes) => {
    const BuildComponent = sequelize.define('BuildComponent', {})

    BuildComponent.associate = (db) => {
        BuildComponent.belongsTo(db.Build, { foreignKey: { name: 'build_id', allowNull: false } })
        BuildComponent.belongsTo(db.Component, { foreignKey: { name: 'component_id', allowNull: false } })
    }

    return BuildComponent
}
