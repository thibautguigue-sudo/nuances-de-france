# PNYX Data Studio — Audit de convergence

## Résumé

Sur les **212 bases actives** de la cartographie :

| Statut | Bases | % | Signification |
|---|---|---|---|
| ✅ Couvert automatiquement | 55 | 26% | Source intégrée, données présentes dans le fichier maître |
| 🔶 Couvert partiellement | 1 | 0.5% | Proxy disponible (emploi agricole INSEE au lieu du RGA) |
| ⬜ Open data à implémenter | 99 | 47% | Source accessible en ligne, script à écrire |
| 🔴 Source locale (import manuel) | 57 | 27% | Fichier fourni par un organisme local (CD74, DDT74, etc.) |

---

## ✅ Ce qui est couvert (55 bases)

Sources intégrées avec données réelles et antériorité :

- **INSEE RP** (36 bases) : population, ménages, familles, âges, logement, emploi, diplômes, étrangers, migrations — 2007→2022
- **DVF** (4 bases) : transactions immobilières, prix — 2020→2024
- **OFGL** (1 base) : finances locales — 2017→2023
- **DGFIP REI** : impôts locaux 2023
- **FILOSOFI** : revenus, pauvreté — 2018→2021
- **SIRENE** : établissements actifs 2026
- **SITADEL** : construction neuve — 2018→2024
- **BPE** : équipements — 2024
- **DPE ADEME** : étiquettes énergie
- **DREES APL** : accès aux soins 2023
- **France Travail** : DEFM — 2021→2024
- **Géorisques + Hub'Eau** : risques naturels, réseaux eau
- **RNE + Élections** : maires, présidentielle 2022
- **SNCF** : gares, fréquentation — 2019→2024
- **ONISR** : accidents routiers — 2019→2024
- **SDES** : parc véhicules — 2015→2022
- **IPS + Effectifs scolaires** : 1er et 2nd degré — 2022→2024
- **CAF/DADS** (dataset statique) : RSA, salaires

---

## ⬜ Open data à implémenter (99 bases)

### Priorité haute (données communales accessibles)

| Source | Bases | Action |
|---|---|---|
| **AGRESTE** (11) | Exploitations, SAU, cheptel, forêt, marché foncier | Site GéoClip sans CSV direct — problème SSL. Chercher sur data.gouv.fr ou observatoire-des-territoires |
| **ORCAE** (5) | Énergie, émissions, CO2, installations | orcae-auvergne-rhone-alpes.fr — données régionales à la commune |
| **Eau France / BNPE** (5) | Eau potable, assainissement, qualité rivières | API Hub'Eau + SISPEA (partiellement fait) |
| **Agence de l'Eau** (4) | Prélèvements, stations épuration, contrats | API Hub'Eau ou portail RMC |
| **RPLS** (2) | Logement social par commune | Fichier massif DiDo à agréger (comme SIRENE) |
| **ANIL** (3) | Loyers par commune | observatoires-des-loyers.org |
| **DDFIP** (5) | Fichiers fonciers (bâti, terrains) | data.gouv.fr — fichiers annuels |
| **Min. Intérieur accidents** (4) | Détail accidents (lieux, usagers, véhicules) | data.gouv.fr — partiellement fait (total par commune) |
| **DSDEN** (4) | Carte scolaire, classes, découverte | data.education.gouv.fr |

### Priorité moyenne (données départementales ou régionales)

| Source | Bases | Action |
|---|---|---|
| **ATMO** (2) | Qualité de l'air, seuils pollution | atmo-auvergnerhonealpes.fr |
| **CGDD** (2) | Natura 2000, Crit'Air | data.gouv.fr |
| **Min. Dév. Durable** (3) | Immatriculations, parc véhicules détaillé | SDES open data |
| **CNC** (2) | Cinémas, films | cnc.fr / data.gouv.fr |
| **INJEP** (1) | Licences sportives | injep.fr |
| **WGMS** (2) | Glaciers (fronts, masse) | wgms.ch — données internationales |
| **EUROSTAT** (2) | Tourisme plateformes | eurostat.ec.europa.eu |
| **ENEDIS** (1) | Compteurs électriques | data.enedis.fr |

### Priorité basse (données spécialisées)

| Source | Bases | Action |
|---|---|---|
| DREAL (2), CEREMA (1), IGN (1), OFB (1), OLA (1), Météo France (1), BASOL (1), CAPACT (1), SNDS (1), CPAM (1), CARSAT (1), INPI (1), DOUANES (1), Rectorat (2), Boris Mericskay (1), Meilleurs Agents (1), Vélos & Territoires (1) | Données spécialisées | À traiter au cas par cas |

---

## 🔴 Sources locales — import manuel (57 bases)

Ces bases ne sont PAS en open data. Elles proviennent d'organismes locaux qui te fournissent les fichiers directement.

| Source | Bases | Thématiques |
|---|---|---|
| **CD74** (28) | Image éco (8), Outdoor (8), aide sociale (3), frontaliers (2), logement social (1), PA (1), jeunes enfants (1), Suisses (1), CITIA (1), Outdoor OSV (1), SDIS (1) |
| **DDT74** (7) | DLS demandeurs, bruit, routes, logement social financé/livré, OCSOL |
| **PREF74** (4) | Sécurité, CDEC commerce, routes trafic |
| **ADIL** (4) | DLS demandes, profil, évolution, motivations |
| **SMBT** (3) | Tourisme sites, stations, zones touristiques |
| **CMA** (2) | Artisanat immatriculations, RM |
| **CCI** (2) | Commerce grandes surfaces, immatriculations |
| **Autres** (7) | CER France (lait), MEDEF (industrie), DDCS (jeunes), ECLN, USH, INCONNU |

**Stratégie pour ces bases :** tu déposes le fichier CSV/Excel dans un dossier, et tu demandes à Claude Code : "Lis ce fichier, propose le mapping des colonnes vers le fichier maître, et intègre." Claude Code sait faire — c'est le même exercice que l'import de l'existant.

---

## Correspondance fichier PNYX ← bases cartographie

| Fichier | Bases couvertes | Bases à couvrir | Total |
|---|---|---|---|
| agriculture.csv | 1 (emploi agri INSEE) | 12 (AGRESTE, IGN forêt) | 13 |
| demographie.csv | ~20 (INSEE RP) | ~16 (CD74 Image, ENEDIS, CARSAT) | 36 |
| economie.csv | 1 (SIRENE) | 28 (SITADEL locaux, CMA, CCI, CD74, EUROSTAT) | 29 |
| education.csv | 5 (RP + IPS + effectifs) | 7 (DSDEN carte, Rectorat, performances) | 12 |
| elections.csv | 1 (RNE + pres.) | 0 | 1 |
| emploi.csv | 3 (RP + France Travail) | 5 (URSSAF, frontaliers, navettes, sphères) | 8 |
| environnement.csv | 2 (Géorisques + Hub'Eau) | 28 (ORCAE, ATMO, Eau France, WGMS, etc.) | 30 |
| equipements.csv | 2 (BPE + DREES) | 11 (CNC, ARS, INJEP, SDIS, etc.) | 13 |
| finances.csv | 1 (OFGL + REI) | 0 | 1 |
| logement.csv | 5 (RP + DVF + SITADEL + DPE) | 30 (RPLS, ANIL, FILOCOM, DLS, etc.) | 35 |
| revenus.csv | 1 (FILOSOFI) | 0 | 1 |
| social.csv | 1 (dataset statique) | 6 (CAF, CD74 aide sociale) | 7 |
| tourisme.csv | 1 (INSEE hébergement) | 0 direct, SMBT via CD74 | 1 |
| transport.csv | 4 (SNCF + accidents + véhicules) | 13 (routes DDT/PREF, cyclables, TC) | 17 |
| non mappé | — | 8 (DLS → logement, équip. jeunes/PA → equipements) | 8 |
