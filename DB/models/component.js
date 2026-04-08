export default (sequelize, DataTypes) => {
    const Component = sequelize.define('Component', {
        name: { type: DataTypes.STRING, allowNull: false },
        type: { type: DataTypes.STRING, allowNull: false },
        brand: { type: DataTypes.STRING, allowNull: false },
        price: { type: DataTypes.FLOAT, allowNull: false }
    })

    Component.associate = (db) => {
        Component.hasMany(db.Spec, { foreignKey: { name: 'component_id', allowNull: false }, onDelete: 'CASCADE' })
        Component.hasMany(db.ComponentSpec, { foreignKey: { name: 'component_id', allowNull: false }, onDelete: 'CASCADE' })
        Component.hasMany(db.BuildComponent, { foreignKey: { name: 'component_id', allowNull: false }, onDelete: 'CASCADE' })
    }

    return Component
}
