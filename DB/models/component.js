export default (sequelize, DataTypes) => {
    const Component = sequelize.define('Component', {
        name: { type: DataTypes.TEXT, allowNull: false },
        type: { type: DataTypes.TEXT, allowNull: false },
        brand: { type: DataTypes.TEXT, allowNull: false },
        price: { type: DataTypes.FLOAT, allowNull: false },
        imageUrl: { type: DataTypes.TEXT, allowNull: true }
    })

    Component.associate = (db) => {
        Component.hasMany(db.Spec, { foreignKey: { name: 'component_id', allowNull: false }, onDelete: 'CASCADE' })
        Component.hasMany(db.ComponentSpec, { foreignKey: { name: 'component_id', allowNull: false }, onDelete: 'CASCADE' })
        Component.hasMany(db.BuildComponent, { foreignKey: { name: 'component_id', allowNull: false }, onDelete: 'CASCADE' })
    }

    return Component
}
