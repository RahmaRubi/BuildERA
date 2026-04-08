import db from '../DB/models/index.js';
import userRouter from './modules/user/user.router.js'

export const bootstrap = async (app, express) => {

    // Middleware
    app.use(express.json())

    // Routes
    app.use('/users', userRouter)

    // DB Connection
    await db.sequelize.authenticate()
        .then(() => console.log('DB connected successfully'))
        .catch(err => console.log('DB connection error:', err))
}