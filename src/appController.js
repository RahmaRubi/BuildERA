import cors from 'cors';
import db from '../DB/models/index.js';
import authRouter from './modules/auth/auth.controller.js';
import userRouter from './modules/user/user.controller.js';
import componentRouter from './modules/component/component.controller.js';
import buildRouter from './modules/build/build.controller.js';
import { globalError } from './utils/error/global_error.js';
import { notFound } from './utils/error/not_found.js';

export const bootstrap = async (app, express) => {

    // Middleware
    app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
    app.use(express.json())

    // Health check — used by uptime monitors to keep the server warm
    app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }))

    // Routes
    app.use('/auth', authRouter)
    app.use('/user', userRouter)
    app.use('/components', componentRouter)
    app.use('/builds', buildRouter)

    // 404 handler
    app.use(notFound)

    // Global error handler
    app.use(globalError)

    // DB Connection
    await db.sequelize.authenticate()
        .then(() => console.log('DB connected successfully'))
        .catch(err => console.log('DB connection error:', err))
}
