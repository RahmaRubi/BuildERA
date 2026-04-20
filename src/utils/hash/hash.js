import bcrypt from "bcrypt";

export const hash = ({data, saltRound}) => {
    return bcrypt.hashSync(data, saltRound)
}