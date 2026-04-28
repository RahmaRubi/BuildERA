export default (sequelize, DataTypes) => {
    const ComponentSpec = sequelize.define('ComponentSpec', {
        value: { type: DataTypes.TEXT, allowNull: false }
    })

    ComponentSpec.associate = (db) => {
        ComponentSpec.belongsTo(db.Component, { foreignKey: { name: 'component_id', allowNull: false } })
        ComponentSpec.belongsTo(db.Spec, { foreignKey: { name: 'spec_id', allowNull: false } })
    }

    return ComponentSpec
}
