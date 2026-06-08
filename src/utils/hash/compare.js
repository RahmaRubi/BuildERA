import bcrypt from 'bcryptjs'
export const compare = ({data, encryptedData})=> {
    return bcrypt.compareSync(data, encryptedData)
}