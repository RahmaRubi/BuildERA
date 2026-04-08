import * as userService from './user.service.js'

export const create = async (req, res) => {
    const user = await userService.createUser(req.body)
    res.json(user)
}

export const update = async (req, res) => {
    await userService.updateUser(req.body, { id: req.params.id })
    res.json({ message: 'User updated successfully' })
}

export const getAll = async (req, res) => {
    const users = await userService.getAllUsers()
    res.json(users)
}

export const getOne = async (req, res) => {
    const user = await userService.getUser({ id: req.params.id })
    res.json(user)
}
