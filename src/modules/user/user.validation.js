import joi from 'joi';

export const updateProfile = joi.object({
    userName: joi.string().min(3).max(22).required(),
}).required();
