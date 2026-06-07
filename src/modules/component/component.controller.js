import { Router } from 'express';
import * as componentService from './component.service.js';
import { asyncHandler } from '../../utils/error/async_handler.js';

const router = Router();

router.get('/', asyncHandler(componentService.listComponents));
router.get('/:id', asyncHandler(componentService.getComponent));

export default router;
