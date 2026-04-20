
export const isValid = (schema) => {

    return (req, res, next) => {
        
        let result = schema.validate(req.body, {abortEarly: false})

        if(result.error){
            const messages = result.error.details.map((obj) => obj.message)
            return next(new Error(messages), {cause: 400})
        }
        return next()
    }
}