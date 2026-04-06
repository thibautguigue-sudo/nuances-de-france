@echo off
chcp 65001 >nul
cd /d "C:\Users\tguig\Desktop\OP-DA Strategy\nuances-de-france"

echo ============================================
echo  NUANCES DE FRANCE - BUILD AUTOMATIQUE
echo  Démarré à %date% %time%
echo ============================================
echo.

echo [1/4] PMTiles - Polygones précis au zoom...
echo ============================================
claude --yes --max-turns 50 ^
"Tu travailles sur le projet Nuances de France dans le répertoire courant. C'est un React + Vite + MapLibre GL. Les données sont dans public/data/ : communes_geo.json (13MB GeoJSON simplifié des 34931 communes), communes_scores.json (8MB scores par indicateur), departements.json, indicators.json. Le code source est dans src/App.jsx et src/index.css. ^
^
TÂCHE : Remplacer le GeoJSON communal par des tuiles vectorielles PMTiles pour avoir des polygones précis quand on zoome. ^
^
1. Télécharger le contour communal haute résolution : curl -o public/data/communes-5m.geojson https://etalab-datasets.geo.data.gouv.fr/contours-administratifs/2024/geojson/communes-5m.geojson ^
2. Installer tippecanoe via Docker ou npx et générer communes.pmtiles dans public/data/ avec simplification=10, detect-shared-borders, zoom 4 à 12 ^
3. npm install pmtiles ^
4. Modifier App.jsx pour utiliser le protocole pmtiles au lieu du GeoJSON. Importer Protocol de pmtiles, enregistrer le protocole, remplacer la source GeoJSON par une source vector avec url pmtiles:///data/communes.pmtiles. Adapter les layers avec source-layer communes. Le join des scores se fait via match expression sur le code commune. ^
5. Vérifier que npm run build passe sans erreur. ^
^
Ne touche pas au style CSS ni au panneau latéral, change uniquement le rendu de la carte."

if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] Prompt 1 échoué
    echo Erreur Prompt 1 >> build_log.txt
)
echo.

echo [2/4] Optimisation chargement initial...
echo ============================================
claude --yes --max-turns 30 ^
"Même projet Nuances de France. TÂCHE : Optimiser le chargement initial. ^
1. Afficher d'abord la carte des départements (departements.json, 588KB) avec les scores agrégés par département depuis communes_scores.json. ^
2. Charger les tuiles PMTiles en arrière-plan. Quand elles sont prêtes, basculer automatiquement du layer départements au layer communes. ^
3. Afficher une barre de progression pendant le chargement. ^
4. Vérifier que npm run build passe."

if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] Prompt 2 échoué
    echo Erreur Prompt 2 >> build_log.txt
)
echo.

echo [3/4] Recherche et zoom commune...
echo ============================================
claude --yes --max-turns 30 ^
"Même projet Nuances de France. TÂCHE : Améliorer la recherche de communes. ^
1. Générer un fichier public/data/communes_centroids.json avec le centroïde de chaque commune depuis le GeoJSON haute résolution si disponible, sinon depuis communes_geo.json. Format: {code_commune: [lng, lat]}. ^
2. Quand l'utilisateur sélectionne une commune dans la recherche : flyTo vers le centroïde avec zoom 12, highlight le polygone avec un outline jaune épais, afficher le détail dans le side panel. ^
3. Vérifier que npm run build passe."

if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] Prompt 3 échoué
    echo Erreur Prompt 3 >> build_log.txt
)
echo.

echo [4/4] Graphiques par commune...
echo ============================================
claude --yes --max-turns 30 ^
"Même projet Nuances de France. TÂCHE : Ajouter des visualisations dans le panneau latéral quand une commune est sélectionnée. ^
1. Un radar chart SVG inline avec les 9 indicateurs de la commune, en utilisant les couleurs définies dans INDICATORS. ^
2. Un bar chart horizontal comparant la commune à la moyenne nationale pour l'indicateur sélectionné. ^
3. Un gauge chart demi-cercle pour le score principal. ^
Utiliser du SVG pur, pas de librairie externe. Vérifier que npm run build passe."

if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] Prompt 4 échoué
    echo Erreur Prompt 4 >> build_log.txt
)
echo.

echo ============================================
echo  BUILD TERMINÉ à %date% %time%
echo  Vérifier build_log.txt pour les erreurs
echo ============================================

:: Build final
echo.
echo Build final...
call npm run build
echo.
echo Le site est prêt dans dist/
echo Pour déployer : vercel deploy --prod

pause
