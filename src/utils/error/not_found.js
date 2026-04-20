

export const notFound = (req, res, next) => {
    next(new Error('invalid url!',{cause:400}))
  }