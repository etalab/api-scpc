const {parse} = require('querystring')
const {send} = require('micro')
const {fetchExtraitPlanCadastral} = require('./lib/scpc')

function extractQueryString(req) {
  const pos = req.url.indexOf('?')
  return pos === -1 ? '' : req.url.substr(pos + 1)
}

module.exports = async (req, res) => {
  try {
    const qs = extractQueryString(req)
    const extraitPlanCadastral = await fetchExtraitPlanCadastral(parse(qs))
    res.setHeader('Content-Type', 'application/pdf')
    send(res, 200, extraitPlanCadastral)
  } catch (err) {
    if (err.message.startsWith('Le paramètre')) {
      return send(res, 400, {code: 400, message: err.message})
    }
    return send(res, 500, {code: 500, message: err.message})
  }
}
