const express = require('express')
const cors = require('cors')
const morgan = require('morgan')

const app = express()

app.use(cors({origin: true}))

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

app.use('/', require('.')())

const port = process.env.PORT || 5000

app.listen(port, () => {
  console.log(`Start listening on port ${port}`)
})
