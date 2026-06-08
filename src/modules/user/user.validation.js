import joi from 'joi';

export const updateProfile = joi.object({
    userName: joi.string().min(3).max(22),
    phone:    joi.string(),
}).min(1).required();
