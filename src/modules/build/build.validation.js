import joi from 'joi';

export const createBuild = joi.object({
  name:    joi.string().min(1).max(100),
  budget:  joi.number().positive(),
  purpose: joi.string().min(3).max(200).required(),
}).required();

export const updateBuild = joi.object({
  name:    joi.string().min(1).max(100),
  budget:  joi.number().positive(),
  purpose: joi.string().min(3).max(200),
}).min(1).required();

export const addComponent = joi.object({
  componentId: joi.alternatives().try(
    joi.string().pattern(/^\d+$/),
    joi.number().unsafe()
  ).required(),
}).required();
