import express from "express"
import { bootstrap } from "./src/appController.js"

const app = express()
const ready = bootstrap(app, express)

// Vercel export — awaits bootstrap before handling each request
const handler = async (req, res) => {
    await ready
    return app(req, res)
}

// Local development only
if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 3000
    ready.then(() => {
        app.listen(PORT, (error) => {
            if (error) console.log(`Server error on port ${PORT}`)
            else console.log(`Connected to Backend Server successfully on port ${PORT}`)
        })
    })
}

export default handler