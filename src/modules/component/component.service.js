import db from '../../../DB/models/index.js';
import { Op, Sequelize } from 'sequelize';

export const listComponents = async (req, res) => {
  const { type, brand, minPrice, maxPrice, search, page = 1, limit = 20 } = req.query;
  const where = {};

  if (type) where.type = type;
  if (brand) where.brand = brand;
  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
    if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
  }
  if (search) {
    where[Op.and] = Sequelize.where(
      Sequelize.fn('LOWER', Sequelize.col('name')),
      { [Op.like]: `%${search.toLowerCase()}%` }
    );
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const { count: total, rows: components } = await db.Component.findAndCountAll({
    where,
    order: [['name', 'ASC']],
    limit: parseInt(limit),
    offset,
  });

  return res.status(200).json({
    success: true,
    data: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      components,
    },
  });
};

export const getComponent = async (req, res, next) => {
  const { id } = req.params;

  const component = await db.Component.findByPk(id, {
    include: [{
      model: db.ComponentSpec,
      include: [{ model: db.Spec, attributes: ['name'] }],
    }],
  });

  if (!component) return next(new Error('Component not found', { cause: 404 }));

  const { ComponentSpecs, ...rest } = component.get({ plain: true });
  const specs = Object.fromEntries(ComponentSpecs.map(cs => [cs.Spec.name, cs.value]));

  return res.status(200).json({ success: true, data: { ...rest, specs } });
};
