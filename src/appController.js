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
    app.use(cors());
    app.use(express.json())

    // Health check — used by uptime monitors to keep the server warm
    app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }))

    // Routes
    app.get('/', (req, res, next) => {res.json({msg: "Welcome"})})
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

    // Schema migrations
    const migrations = [
        'ALTER TABLE Builds ADD COLUMN IF NOT EXISTS name VARCHAR(255) NULL',
        'ALTER TABLE Builds ADD COLUMN IF NOT EXISTS shareToken VARCHAR(255) NULL',
        `CREATE TABLE IF NOT EXISTS Favorites (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            component_id INT NOT NULL,
            createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_user_component (user_id, component_id),
            FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
            FOREIGN KEY (component_id) REFERENCES Components(id) ON DELETE CASCADE
        )`,
    ];
    for (const sql of migrations) {
        await db.sequelize.query(sql)
            .then(() => console.log(`Migration OK: ${sql.slice(0, 60)}`))
            .catch(err => console.log(`Migration skipped (${err.message.slice(0, 60)})`));
    }
}
