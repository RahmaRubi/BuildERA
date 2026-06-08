import 'dotenv/config'
import express from "express"
import { bootstrap } from "./src/appController.js"

const app = express()
const PORT = process.env.PORT || 3000

bootstrap(app, express).then(() => {
    app.listen(PORT, (error) => {
        if (error) console.log(`Server error on port ${PORT}`)
        else console.log(`Server running on port ${PORT}`)
    })
})
