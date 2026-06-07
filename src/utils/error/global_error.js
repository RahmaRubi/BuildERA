

export const globalError = (error, req, res, next) => {
    const response = { success: false, message: error.message };
    if (error.data) response.data = error.data;
    return res.status(error.cause || 500).json(response);
  }