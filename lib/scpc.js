const createError = require('http-errors')
const request = require('superagent')
const {padStart, keyBy, deburr} = require('lodash')
const communes = require('../communes.json')

const communesIndex = keyBy(communes, 'code')

function getCodeDepartement(codeCommune) {
  return codeCommune.startsWith('97') ? codeCommune.slice(0, 3) : codeCommune.slice(0, 2)
}

const SCPC_URL = 'https://www.cadastre.gouv.fr/scpc'

async function generateToken(agent) {
  const tokenPage = await agent.get(`${SCPC_URL}/rechercherParReferenceCadastrale.do`)
  const [, csrfToken] = tokenPage.text.match(/CSRF_TOKEN=((?:[\dA-Z]{4}-){7}[\dA-Z]{4})/)
  agent.csrfToken = csrfToken
}

function sendForm(form, params, agent) {
  return agent
    .post(`${SCPC_URL}/${form}.do?CSRF_TOKEN=${agent.csrfToken}`)
    .type('form')
    .send(params)
    .send({CSRF_TOKEN: agent.csrfToken})
}

function getPage(page, params, agent) {
  return agent.get(`${SCPC_URL}/${page}.do?CSRF_TOKEN=${agent.csrfToken}&${params}`)
}

const REQUIRED_PARAMS = ['commune', 'prefixe', 'section', 'parcelle']

async function fetchExtraitPlanCadastral(params) {
  REQUIRED_PARAMS.forEach(requiredParam => {
    if (!(requiredParam in params)) {
      throw createError(400, `Le paramètre '${requiredParam}' est obligatoire.`)
    }
  })

  const {prefixe, section, parcelle} = params

  const commune = communesIndex[params.commune]

  if (!commune) {
    throw createError(400, 'Commune inconnue')
  }

  const echelle = params.echelle ? Number.parseInt(params.echelle, 10) : 1000

  const agent = request.agent()
  await generateToken(agent)

  // Affichage du formulaire de recherche
  await getPage('afficherRechercherPlanCad', '', agent)

  // Soumission des critères de recherche et affichage du résultat
  const searchPage = await sendForm('rechercherParReferenceCadastrale', {
    ville: deburr(commune.nom).toUpperCase(),
    codeDepartement: padStart(getCodeDepartement(commune.code), 3, '0'),
    rechercheType: 1,
    prefixeParcelle: prefixe,
    sectionLibelle: section,
    numeroParcelle: parcelle,
    prefixeFeuille: prefixe // Facultatif ?
  }, agent)

  // Extraction des identifiants de feuille et de parcelle
  const feuilleMatch = searchPage.text.match(/f=([A-Z\d]{12})/)

  if (!feuilleMatch) {
    throw createError(400, 'Feuille non trouvée')
  }

  const parcelleMatch = searchPage.text.match(/p=([A-Z\d]{14})/)

  if (!feuilleMatch) {
    throw createError(400, 'Parcelle non trouvée')
  }

  const [, feuilleId] = feuilleMatch
  const [, parcelleId] = parcelleMatch

  // Affichage de la carte
  const displayMapQuery = `p=${parcelleId}&f=${feuilleId}&dontSaveLastForward&keepVolatileSession=`
  const displayMapPage = await getPage('afficherCarteParcelle', displayMapQuery, agent)

  // Extraction du centre de la parcelle
  const displayMapPageExtraction = displayMapPage.text.match(/new Point\((.*),(.*)\)/)

  if (!displayMapPageExtraction[1] || !displayMapPageExtraction[2]) {
    throw createError(400, 'Impossible de localiser le centre de la parcelle')
  }

  const x = Number.parseFloat(displayMapPageExtraction[1])
  const y = Number.parseFloat(displayMapPageExtraction[2])

  const orientation = params.orientation === 'paysage' ? 'Paysage' : 'Portrait'
  const taille = params.taille === 'A3' ? 'A3' : 'A4'

  // Calcul de l'emprise à imprimer
  const {xMin, xMax, yMin, yMax} = computeBbox({x, y, taille, orientation, echelle})

  // Récupération du fichier PDF
  const finalResultQuery = {
    MAPBBOX: [xMin, yMin, xMax, yMax].map(coord => coord.toFixed(3)).join(','),
    MAPROTATION: 0,
    TAILLEPAGE: taille,
    ORIENTPAGE: orientation,
    RFV_REF: '',
    RFV_X: x.toFixed(3),
    RFV_Y: y.toFixed(3),
    ECHELLE: echelle,
    NATURE: 'V',
    RESOLUTION: '',
    DRAPEAU: 'false'
  }
  const finalResult = await sendForm('imprimerExtraitCadastral', finalResultQuery, agent).buffer()

  if (finalResult.type !== 'application/pdf') {
    throw createError(500, 'Impossible de récupérer le document', {expose: true})
  }

  return finalResult.body
}

const MAP_SIZES = {
  'A3-Paysage': {width: 31600, height: 28300},
  'A3-Portrait': {width: 28150, height: 30100},
  'A4-Paysage': {width: 21070, height: 19700},
  'A4-Portrait': {width: 19550, height: 21100}
}

function computeBbox({x, y, taille, orientation, echelle}) {
  const {width, height} = MAP_SIZES[`${taille}-${orientation}`]
  const xMin = x - ((width / 100000) * echelle / 2)
  const xMax = x + ((width / 100000) * echelle / 2)
  const yMin = y - ((height / 100000) * echelle / 2)
  const yMax = y + ((height / 100000) * echelle / 2)

  return {xMin, xMax, yMin, yMax}
}

module.exports = {fetchExtraitPlanCadastral}
