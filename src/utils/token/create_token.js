import jwt from 'jsonwebtoken'

export const createToken = ({payload, secretKey= process.env.JWT_SECRET, options}) => {
    return jwt.sign(payload, secretKey, options)
}