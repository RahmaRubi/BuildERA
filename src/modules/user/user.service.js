import db from '../../../DB/models/index.js';
import { decrypt, encrypt, hash, compare } from '../../utils/index.js';

const User = db.User;

export const getProfile = async (req, res, next) => {
    const authUser = req.user.toJSON();
    authUser.phone = decrypt({ data: authUser.phone });
    return res.status(200).json({ success: true, data: authUser });
};

export const updateProfile = async (req, res, next) => {
    const { userName, phone, currentPassword, password } = req.body;
    const updates = {};

    if (userName) updates.userName = userName;
    if (phone)    updates.phone    = encrypt({ data: phone });

    if (currentPassword && password) {
        const isMatch = compare({ data: currentPassword, encryptedData: req.user.password });
        if (!isMatch) return next(new Error('Current password is incorrect', { cause: 400 }));
        updates.password = hash({ data: password, saltRound: 8 });
    }

    await User.update(updates, { where: { id: req.user.id } });

    const updated = await User.findByPk(req.user.id);
    const userJSON = updated.toJSON();
    userJSON.phone = decrypt({ data: userJSON.phone });
    return res.status(200).json({ success: true, data: userJSON });
};

export const freezeAccount = async (req, res, next) => {
    await User.update({ isDeleted: true, deletedAt: new Date() }, { where: { id: req.user.id } });
    return res.status(200).json({ success: true, message: 'Account frozen successfully' });
};
