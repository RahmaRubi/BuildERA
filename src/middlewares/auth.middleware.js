import db from '../../DB/models/index.js';
import { verifyToken } from "../utils/token/verify_token.js";
import { messages } from "../utils/message/index.js";

const User = db.User;

export const isAuthenticate = async (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization)
    return next(new Error("token is required", { cause: 400 }));

  if (!authorization.startsWith("access"))
    return next(new Error("invalid token", { cause: 400 }));

  const token = authorization.split(" ")[1];

  const { error, id, iat } = verifyToken({ token });
  if (error) return next(error);

  const userExist = await User.findByPk(id);

  if (!userExist)
    return next(new Error(messages.user.notFound, { cause: 404 }));

  if (userExist.isDeleted) return next(new Error("your account is freezed, plz login first!", { cause: 404 }));
  if (userExist.deletedAt && iat * 1000 < new Date(userExist.deletedAt).getTime())
    return next(new Error("destroyed token!", { cause: 400 }));

  req.user = userExist;
  next();
};
