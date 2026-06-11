

export const globalError = (error, req, res, next) => {
    if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ success: false, message: 'Email already registered' });
    }
    const response = { success: false, message: error.message };
    if (error.data) response.data = error.data;
    return res.status(error.cause || 500).json(response);
}