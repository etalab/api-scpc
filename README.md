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

`echelle` : dénominateur de l’échelle du plan. Échelles disponibles : 200, 500, 650, 1000, 1250, 1500, 2000, 2500, 4000, 5000

À venir : rotation du plan, mode paysage, format A3, parcelles en instance de mise à jour
