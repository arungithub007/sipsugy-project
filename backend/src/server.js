import 'dotenv/config'
import { createApp } from './app.js'
import { checkDbConnection } from './config/db.js'

const PORT = process.env.PORT || 4000
const app = createApp()

app.listen(PORT, async () => {
  console.log(`SipSugy backend listening on port ${PORT}`)

  const db = await checkDbConnection()
  if (db.configured && db.connected) {
    console.log('Connected to MySQL.')
  } else if (db.configured) {
    console.warn('DB_HOST is set but the connection failed — running on seed/in-memory data:', db.error)
  } else {
    console.warn('No DB_HOST configured yet — running on seed/in-memory data until the database tier is added.')
  }
})
