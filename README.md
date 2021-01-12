# API SCPC

API permettant de générer un extrait de plan cadastral à partir du service [cadastre.gouv.fr](https://www.cadastre.gouv.fr).

Exemple : https://sandbox.geo.api.gouv.fr/scpc/?commune=54084&prefixe=000&section=AD&parcelle=89

## Paramètres

### Identification de la parcelle

La parcelle peut être identifiée à partir du quadruplet (commune, préfixe de section, section et numéro de parcelle) ou de son identifiant unique sur 14 caractères.

#### Quadruplet

`commune` : commune INSEE de la commune

`prefixe` : préfixe de section de la commune sur 3 caractères (code de la commune absorbée dans le département) ou `000`

`section` : lettre ou numéro de la section (au plus 2 caractères)

`parcelle` : numéro de la parcelle (au plus 4 caractères)

#### Identifiant unique

(à venir)

### Paramètres d’impression

`echelle` : dénominateur de l’échelle du plan. Échelles disponibles : `200`, `500`, `650`, `1000` (par défaut), `1250`, `1500`, `2000`, `2500`, `4000`, `5000`.

`taille` : taille de la page à imprimer. Tailles disponibles : `A4` (par défaut) et `A3`.

`orientation` : orientation de la page. Orientations disponibles : `portrait` (par défaut) et `paysage`

`x` et `y` : coordonnées du centre de l’extrait, en projection légale CC. Ce paramètre est facultatif et sert cadrer l’extrait au mieux.

## Utilisation

Dans tous les cas, une installation Node.js 12 ou supérieur fonctionnelle est nécessaire. yarn peut être remplacé par npm.

### En tant que serveur HTTP autonome

```bash
git clone https://github.com/etalab/api-scpc.git
cd api-scpc
yarn --prod
yarn start
```

Le port peut être modifié via la variable d'environnement `PORT`.

### En tant que module Express.js

```bash
yarn add @etalab/api-scpc
```

```js
const {scpc} = require('@etalab/api-scpc')

app.use('/', scpc())
```

### En tant que fonction JS

NB : bien qu'utilisable dans le navigateur, cette fonction ne donnera aucun résultat car le serveur cadastre.gouv.fr n’autorise pas les appels cross-origin.

```bash
yarn add @etalab/api-scpc
```

```js
const {fetchExtraitPlanCadastral} = require('@etalab/api-scpc')

await fetchExtraitPlanCadastral(options)
```

## TODO

- Support de la rotation du plan
- Affichage d’un drapeau pour les parcelles en instance de mise à jour
- Détection automatique de la feuille (plus besoin de fournir la feuille ou la parcelle)
- Support de WGS-84 en entrée
