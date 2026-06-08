import 'mysql2'

let app = null

export default async function handler(req, res) {
    try {
        if (!app) {
            const { default: express } = await import('express')
            const { bootstrap }        = await import('../src/appController.js')
            app = express()
            await bootstrap(app, express)
        }
        return app(req, res)
    } catch (err) {
        console.error('CRASH:', err)
        return res.status(500).json({
            crashed: true,
            error:   err.message,
            type:    err.constructor?.name,
            stack:   err.stack?.split('\n').slice(0, 8)
        })
    }
}
