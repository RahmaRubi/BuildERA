import { Router } from 'express'
import * as userController from './user.controller.js'

const router = Router()

router.post('/', userController.create)
router.get('/', userController.getAll)
router.get('/:id', userController.getOne)
router.put('/:id', userController.update)

export default router
