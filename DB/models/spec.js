export default (sequelize, DataTypes) => {
    const Spec = sequelize.define('Spec', {
        name: { type: DataTypes.TEXT, allowNull: false }
    })

    Spec.associate = (db) => {
        Spec.belongsTo(db.Component, { foreignKey: { name: 'component_id', allowNull: false } })
        Spec.hasMany(db.ComponentSpec, { foreignKey: { name: 'spec_id', allowNull: false }, onDelete: 'CASCADE' })
    }

    return Spec
}
