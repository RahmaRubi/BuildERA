import bcrypt from 'bcrypt'
export const compare = ({data, encryptedData})=> {
    return bcrypt.compareSync(data, encryptedData)
}