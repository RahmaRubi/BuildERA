import db from '../../../DB/models/index.js';
import { decrypt } from '../../utils/crypto/decrypt.js'

const User = db.User;

export const getProfile = async(req, res, next) => {
    const authUser = req.user.toJSON()
    authUser.phone = decrypt({data: authUser.phone})
    return res.status(200).json({success: true, data: authUser})
}

export const freezeAccount = async(req, res, next) => {
    await User.update({ isDeleted: true, deletedAt: new Date() }, { where: { id: req.user.id } })
    return res.status(200).json({success: true, message: "ur account is freezed"})
}
