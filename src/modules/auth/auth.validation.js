import joi from 'joi'

export const register = joi.object({
    userName: joi.string().min(3).max(22).required(),
    email: joi.string().email().required(),
    password: joi.string().required(),
    cPassword: joi.string().valid(joi.ref("password")).required(),
    phone: joi.string().required(),
}).required()

export const login = joi.object({
    email: joi.string().email().required(),
    password: joi.string().required(),
}).required()

export const forgotPassword = joi.object({
    email: joi.string().email().required(),
}).required()

export const resetPassword = joi.object({
    password: joi.string().min(6).required(),
    cPassword: joi.string().valid(joi.ref("password")).required(),
}).required()
