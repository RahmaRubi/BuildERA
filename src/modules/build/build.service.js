import db from '../../../DB/models/index.js';
import { checkComponentList } from './build.compatibility.js';

export const createBuild = async (req, res) => {
  const { name, budget, purpose } = req.body;
  const build = await db.Build.create({ name, budget, purpose, user_id: req.user.id });
  return res.status(201).json({ success: true, data: build });
};

export const getBuilds = async (req, res) => {
  const builds = await db.Build.findAll({
    where: { user_id: req.user.id },
    include: [{
      model: db.BuildComponent,
      attributes: ['id'],
      include: [{ model: db.Component, attributes: ['price'] }],
    }],
    order: [['createdAt', 'DESC']],
  });

  const data = builds.map(b => {
    const { BuildComponents, ...build } = b.get({ plain: true });
    return {
      ...build,
      componentCount: BuildComponents.length,
      totalPrice: BuildComponents.reduce((sum, bc) => sum + (bc.Component?.price || 0), 0),
    };
  });

  return res.status(200).json({ success: true, data });
};

export const getBuild = async (req, res, next) => {
  const build = await db.Build.findOne({
    where: { id: req.params.id, user_id: req.user.id },
    include: [{ model: db.BuildComponent, include: [{ model: db.Component }] }],
  });
  if (!build) return next(new Error('Build not found', { cause: 404 }));

  const { BuildComponents, ...buildData } = build.get({ plain: true });
  const components = BuildComponents.map(bc => ({ ...bc.Component, buildComponentId: bc.id }));
  const totalPrice = components.reduce((sum, c) => sum + (c.price || 0), 0);

  return res.status(200).json({ success: true, data: { ...buildData, components, totalPrice } });
};

export const updateBuild = async (req, res, next) => {
  const [updated] = await db.Build.update(req.body, {
    where: { id: req.params.id, user_id: req.user.id },
  });
  if (!updated) return next(new Error('Build not found', { cause: 404 }));
  const build = await db.Build.findByPk(req.params.id);
  return res.status(200).json({ success: true, data: build });
};

export const deleteBuild = async (req, res, next) => {
  const deleted = await db.Build.destroy({ where: { id: req.params.id, user_id: req.user.id } });
  if (!deleted) return next(new Error('Build not found', { cause: 404 }));
  return res.status(200).json({ success: true, message: 'Build deleted successfully' });
};

export const addComponent = async (req, res, next) => {
  const { componentId } = req.body;

  const build = await db.Build.findOne({ where: { id: req.params.id, user_id: req.user.id } });
  if (!build) return next(new Error('Build not found', { cause: 404 }));

  const component = await db.Component.findByPk(componentId);
  if (!component) return next(new Error('Component not found', { cause: 404 }));

  const existing = await db.BuildComponent.findOne({
    where: { build_id: build.id, component_id: componentId },
  });
  if (existing) return next(new Error('Component already in this build', { cause: 400 }));

  const bcRows = await db.BuildComponent.findAll({
    where: { build_id: build.id },
    include: [{ model: db.Component, attributes: ['id', 'name', 'type'] }],
  });
  const currentComponents = bcRows.map(bc => bc.Component.get({ plain: true }));
  const simulated = [...currentComponents, { id: component.id, name: component.name, type: component.type }];

  const compatibility = await checkComponentList(simulated);

  if (compatibility.errors.length > 0) {
    compatibility.summary.totalComponents = currentComponents.length;
    const err = new Error(`${component.name} is incompatible with your current build`, { cause: 400 });
    err.data = compatibility;
    return next(err);
  }

  await db.BuildComponent.create({ build_id: build.id, component_id: componentId });

  return res.status(201).json({ success: true, message: `${component.name} added to build`, compatibility });
};

export const removeComponent = async (req, res, next) => {
  const build = await db.Build.findOne({ where: { id: req.params.id, user_id: req.user.id } });
  if (!build) return next(new Error('Build not found', { cause: 404 }));

  const bc = await db.BuildComponent.findOne({
    where: { build_id: build.id, component_id: req.params.componentId },
  });
  if (!bc) return next(new Error('Component not in this build', { cause: 404 }));

  await bc.destroy();
  return res.status(200).json({ success: true, message: 'Component removed from build' });
};
