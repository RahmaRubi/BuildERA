import db from '../../../DB/models/index.js';
import { decrypt, encrypt, hash, compare } from '../../utils/index.js';

const User = db.User;

export const getProfile = async (req, res, next) => {
    const authUser = req.user.toJSON();
    if (authUser.phone) authUser.phone = decrypt({ data: authUser.phone });
    return res.status(200).json({ success: true, data: authUser });
};

export const updateProfile = async (req, res, next) => {
    const { userName, phone } = req.body;
    const updates = {};

    if (userName) updates.userName = userName;
    if (phone)    updates.phone    = encrypt({ data: phone });

    await User.update(updates, { where: { id: req.user.id } });

    const updated = await User.findByPk(req.user.id);
    const userJSON = updated.toJSON();
    if (userJSON.phone) userJSON.phone = decrypt({ data: userJSON.phone });
    return res.status(200).json({ success: true, data: userJSON });
};

export const freezeAccount = async (req, res, next) => {
    await User.update({ isDeleted: true, deletedAt: new Date() }, { where: { id: req.user.id } });
    return res.status(200).json({ success: true, message: 'Account frozen successfully' });
};

export const getFavorites = async (req, res, next) => {
    const favorites = await db.Favorite.findAll({
        where: { user_id: req.user.id },
        include: [{
            model: db.Component,
            include: [{
                model: db.ComponentSpec,
                include: [{ model: db.Spec, attributes: ['name'] }],
            }],
        }],
    });

    const components = favorites.map(f => {
        const { ComponentSpecs, ...rest } = f.Component.get({ plain: true });
        const specs = Object.fromEntries(ComponentSpecs.map(cs => [cs.Spec.name, cs.value]));
        return { ...rest, specs };
    });

    return res.status(200).json({ success: true, data: components });
};

export const addFavorite = async (req, res, next) => {
    const { componentId } = req.params;

    const component = await db.Component.findByPk(componentId);
    if (!component) return next(new Error('Component not found', { cause: 404 }));

    const existing = await db.Favorite.findOne({ where: { user_id: req.user.id, component_id: componentId } });
    if (existing) return next(new Error('Component already in favorites', { cause: 409 }));

    await db.Favorite.create({ user_id: req.user.id, component_id: componentId });
    return res.status(201).json({ success: true, message: 'Added to favorites' });
};

export const removeFavorite = async (req, res, next) => {
    const { componentId } = req.params;

    const deleted = await db.Favorite.destroy({ where: { user_id: req.user.id, component_id: componentId } });
    if (!deleted) return next(new Error('Favorite not found', { cause: 404 }));

    return res.status(200).json({ success: true, message: 'Removed from favorites' });
};
