const express = require('express')
const {fetchExtraitPlanCadastral} = require('./lib/scpc')

module.exports = () => {
  const app = new express.Router()

  function w(handler) {
    return async (req, res, next) => {
      try {
        await handler(req, res, next)
      } catch (err) {
        next(err)
      }
    }
  }

  app.get('/', w(async (req, res) => {
    const extraitPlanCadastral = await fetchExtraitPlanCadastral(req.query)
    res.setHeader('Content-Type', 'application/pdf')
    res.send(extraitPlanCadastral)
  }))

  return app
}
