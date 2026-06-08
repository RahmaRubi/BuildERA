import bcrypt from "bcryptjs";

export const hash = ({data, saltRound}) => {
    return bcrypt.hashSync(data, saltRound)
}