import CryptoJS from "crypto-js";

export const decrypt = ({data, cryptoKey=process.env.CRYPTO_KEY}) => {
    return CryptoJS.AES.decrypt(data, cryptoKey).toString(CryptoJS.enc.Utf8)
}