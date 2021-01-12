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
      throw new Error(`Le paramètre '${requiredParam}' est obligatoire.`)
    }
  })

  const {prefixe, section, parcelle} = params

  const commune = communesIndex[params.commune]

  if (!commune) {
    throw new Error('Commune inconnue')
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
    throw new Error('Feuille non trouvée')
  }

  const parcelleMatch = searchPage.text.match(/p=([A-Z\d]{14})/)

  if (!feuilleMatch) {
    throw new Error('Parcelle non trouvée')
  }

  const [, feuilleId] = feuilleMatch
  const [, parcelleId] = parcelleMatch

  // Affichage de la carte
  const displayMapQuery = `p=${parcelleId}&f=${feuilleId}&dontSaveLastForward&keepVolatileSession=`
  const displayMapPage = await getPage('afficherCarteParcelle', displayMapQuery, agent)

  // Extraction du centre de la parcelle
  const displayMapPageExtraction = displayMapPage.text.match(/new Point\((.*),(.*)\)/)

  if (!displayMapPageExtraction[1] || !displayMapPageExtraction[2]) {
    throw new Error('Impossible de localiser le centre de la parcelle')
  }

  const x = Number.parseFloat(displayMapPageExtraction[1])
  const y = Number.parseFloat(displayMapPageExtraction[2])

  // Calcul de l'emprise à imprimer
  const A4_MAP_WIDTH = 0.195
  const A4_MAP_HEIGHT = 0.211

  const xMin = x - (A4_MAP_WIDTH * echelle / 2)
  const xMax = x + (A4_MAP_WIDTH * echelle / 2)
  const yMin = y - (A4_MAP_HEIGHT * echelle / 2)
  const yMax = y + (A4_MAP_HEIGHT * echelle / 2)

  // Récupération du fichier PDF
  const finalResultQuery = {
    MAPBBOX: [xMin, yMin, xMax, yMax].map(coord => coord.toFixed(3)).join(','),
    MAPROTATION: 0,
    TAILLEPAGE: 'A4',
    ORIENTPAGE: 'Portrait',
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
    throw new Error('Impossible de récupérer le document')
  }

  return finalResult.body
}

module.exports = {fetchExtraitPlanCadastral}
