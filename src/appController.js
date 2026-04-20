import db from '../DB/models/index.js';
import authRouter from './modules/auth/auth.controller.js';
import userRouter from './modules/user/user.controller.js';
import { globalError } from './utils/error/global_error.js';
import { notFound } from './utils/error/not_found.js';

export const bootstrap = async (app, express) => {

    // Middleware
    app.use(express.json())

    // Routes
    app.use('/auth', authRouter)
    app.use('/user', userRouter)

    // 404 handler
    app.use(notFound)

    // Global error handler
    app.use(globalError)

    // DB Connection
    await db.sequelize.authenticate()
        .then(() => console.log('DB connected successfully'))
        .catch(err => console.log('DB connection error:', err))
}
