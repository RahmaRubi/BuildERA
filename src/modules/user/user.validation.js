import joi from 'joi';

export const updateProfile = joi.object({
    userName:        joi.string().min(3).max(22),
    phone:           joi.string(),
    currentPassword: joi.string(),
    password:        joi.string().min(6),
    cPassword:       joi.string().valid(joi.ref('password')),
})
.with('password', ['currentPassword', 'cPassword'])
.with('currentPassword', ['password', 'cPassword'])
.or('userName', 'phone', 'currentPassword')
.required();
