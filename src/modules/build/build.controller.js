import { Router } from 'express';
import * as buildService from './build.service.js';
import { checkCompatibility } from './build.compatibility.js';
import { isAuthenticate } from '../../middlewares/auth.middleware.js';
import { isValid } from '../../middlewares/validation.middleware.js';
import { asyncHandler } from '../../utils/error/async_handler.js';
import * as v from './build.validation.js';

const router = Router();

// Public route — no auth required
router.get('/shared/:token', asyncHandler(buildService.getSharedBuild));

// All routes below require authentication
router.use(isAuthenticate);

router.post('/',    isValid(v.createBuild), asyncHandler(buildService.createBuild));
router.get('/',                             asyncHandler(buildService.getBuilds));
router.get('/:id',                          asyncHandler(buildService.getBuild));
router.put('/:id',  isValid(v.updateBuild), asyncHandler(buildService.updateBuild));
router.delete('/:id',                       asyncHandler(buildService.deleteBuild));

router.post('/:id/share',                              asyncHandler(buildService.shareBuild));
router.post('/:id/components', isValid(v.addComponent), asyncHandler(buildService.addComponent));
router.delete('/:id/components/:componentId',           asyncHandler(buildService.removeComponent));

router.get('/:id/compatibility', asyncHandler(checkCompatibility));

export default router;
