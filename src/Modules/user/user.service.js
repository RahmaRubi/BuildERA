import db from '../../../DB/models/index.js'

const { User } = db

export const createUser = (data) => User.create(data)

export const updateUser = (data, where) => User.update(data, { where })

export const getAllUsers = () => User.findAll()

export const getUser = (where) => User.findOne({ where })
