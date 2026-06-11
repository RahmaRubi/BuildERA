import db from '../../../DB/models/index.js';
import {sendEmail, createToken, verifyToken, hash, compare, encrypt} from '../../utils/index.js'
import { messages } from "../../utils/message/index.js";

const User = db.User;
const BASE_URL     = (process.env.BACKEND_URL  || 'http://localhost:3000').replace(/\/$/, '');
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

export const register = async (req, res, next) => {

    const { userName, email, password } = req.body;
    const createdUser = await User.create({
      userName,
      email,
      password: hash({data:password, saltRound:8}),
    });

    const token = createToken({payload: {id: createdUser.id}, options: {expiresIn: "15m"}})
    const link = `${BASE_URL}/auth/activate-account/${token}`;
    const emailSent = await sendEmail({
      to: email,
      subject: "Email Verification from buildERA app",
      html: `<b>click <a href=${link}>here</a> to verify your account</b>`,
    });

    if (!emailSent){
      return next(new Error(messages.user.emailNotSent, { cause: 500 }));
    }

    return res.status(200).json({
      success: true,
      message: messages.user.createdSuccessfully,
      data: createdUser,
    });

};

export const login = async (req, res, next) => {

    const { email, password } = req.body;
    const userExist = await User.findOne({ where: { email } });

    if (!userExist) {
      return next(new Error(messages.user.notFound, { cause: 401 }));
    }
    if (!userExist.isConfirmed) {
      return next(new Error("verify your account first!", { cause: 400 }));
    }
    if (!compare({data: password, encryptedData: userExist.password})) {
      return next(new Error(messages.user.incorrectPassword, { cause: 401 }));
    }

    if(userExist.isDeleted){
      await User.update({ isDeleted: false }, { where: { id: userExist.id } });
    }
    const token = createToken({payload: {email, id: userExist.id}, options:{expiresIn: '1h'}})

    const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=6366f1&color=fff&name=' + encodeURIComponent(userExist.userName);

    return res.status(200).json({
      success: true,
      message: "logged in successfully",
      token,
      userName: userExist.userName,
      imageUrl: userExist.imageUrl || DEFAULT_AVATAR,
    });

};

export const activateAccount = async (req, res, next) => {

    const { token } = req.params;
    const { id } = verifyToken({token});

    const [updated] = await User.update({ isConfirmed: true }, { where: { id } });
    if (!updated) {
      return next(new Error(messages.user.notFound, { cause: 400 }));
    }
    return res.status(200).json({
      success: true,
      message: "account activated, please login",
    });

};

export const resendVerification = async (req, res, next) => {

    const { email } = req.body;
    const user = await User.findOne({ where: { email, isDeleted: false } });
    if (!user) return next(new Error(messages.user.notFound, { cause: 404 }));
    if (user.isConfirmed) return next(new Error('Account is already verified', { cause: 400 }));

    const token = createToken({ payload: { id: user.id }, options: { expiresIn: '15m' } });
    const link  = `${BASE_URL}/auth/activate-account/${token}`;
    const emailSent = await sendEmail({
        to: email,
        subject: 'Email Verification from buildERA app',
        html: `<b>Click <a href="${link}">here</a> to verify your account. Link expires in 15 minutes.</b>`,
    });

    if (!emailSent) return next(new Error(messages.user.emailNotSent, { cause: 500 }));

    return res.status(200).json({ success: true, message: 'Verification email resent successfully' });

};

export const forgotPassword = async (req, res, next) => {

    const { email } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return next(new Error(messages.user.notFound, { cause: 404 }));
    }

    const token = createToken({ payload: { id: user.id }, options: { expiresIn: "15m" } });
    const link = `${FRONTEND_URL}/reset-password?token=${token}`;
    const emailSent = await sendEmail({
      to: email,
      subject: "Password Reset Request - BuildERA",
      html: `<b>Click <a href="${link}">here</a> to reset your password. This link expires in 15 minutes.</b>`,
    });

    if (!emailSent) {
      return next(new Error(messages.user.emailNotSent, { cause: 500 }));
    }

    return res.status(200).json({
      success: true,
      message: "Password reset email sent successfully",
    });

};

export const resetPassword = async (req, res, next) => {

    const { token } = req.params;
    const { password } = req.body;

    const decoded = verifyToken({ token });
    if (decoded.error) {
      return next(new Error("Invalid or expired reset token", { cause: 400 }));
    }

    const user = await User.findOne({ where: { id: decoded.id } });
    if (!user) {
      return next(new Error(messages.user.notFound, { cause: 404 }));
    }

    await User.update(
      { password: hash({ data: password, saltRound: 8 }) },
      { where: { id: user.id } }
    );

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });

};
