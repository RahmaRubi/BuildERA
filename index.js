import express from "express"
import { bootstrap } from "./src/appController.js"

const app = express()
await bootstrap(app, express)

const PORT = process.env.PORT || 3000
app.listen(PORT, (error) => {
    if (error)
        console.log(`Error while connecting to Backend server on port ${PORT}`)
    else
        console.log(`Connected to Backend Server successfully on port ${PORT}`)
})

export default app