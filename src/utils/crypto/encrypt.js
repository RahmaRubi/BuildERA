import CryptoJS from "crypto-js"


export const encrypt = ({data, encryptionKey = process.env.CRYPTO_KEY}) => {
    return CryptoJS.AES.encrypt(data, encryptionKey).toString()
}