import { useState } from 'react'
import { INDICATORS } from '../constants'

/**
 * Démonstrateur de méthodologie — section dépliable (déployée par défaut)
 * présentée en bas de chaque page.
 *
 * Rôle :
 *  1. Expliquer de façon complète et détaillée la méthodologie Nuances de France
 *  2. Documenter la nature de cette démo (données d'opinion simulées +
 *     données open data réelles) à partir des documents méthodologiques du projet
 *  3. Démontrer, en conclusion, la puissance de l'outil une fois alimenté
 *     par une vraie étude d'opinion ad hoc
 */
export function MethodologySection() {
  const [open, setOpen] = useState(true)

  return (
    <section className="methodo">
      <div className="methodo-inner">
        <button
          className="methodo-toggle"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
        >
          <span className={`methodo-chev${open ? ' open' : ''}`}>▸</span>
          <span className="methodo-kicker">Démonstrateur de méthodologie</span>
          <h2 className="serif methodo-title">
            Comment Nuances de France transforme l'opinion citoyenne en carte d'action
          </h2>
          <span className="methodo-hint">
            {open ? 'Replier' : 'Déployer'}
          </span>
        </button>

        {open && (
          <div className="methodo-body">

            {/* ─── 1. Vision ─── */}
            <div className="methodo-block">
              <div className="methodo-label">1 · Vision</div>
              <p>
                Nuances de France croise <strong>opinion citoyenne</strong> et
                <strong> données publiques objectives</strong> pour produire, à la
                maille de chaque commune, une lecture fine et comparable du
                ressenti et de la réalité vécue sur 9 thématiques structurantes
                de la vie locale. L'objectif est de rendre visible, territoire
                par territoire, le <em>delta perception / réalité</em> — là où
                un indicateur chiffré dit une chose et où les habitants en
                disent une autre.
              </p>
            </div>

            {/* ─── 2. Architecture ─── */}
            <div className="methodo-block">
              <div className="methodo-label">2 · Architecture de l'indicateur composite</div>
              <p>
                Chaque indicateur est bâti sur deux piliers strictement équilibrés :
              </p>
              <div className="methodo-grid2">
                <div className="methodo-pillar methodo-pillar--opinion">
                  <div className="methodo-pillar-title">Note Opinion</div>
                  <div className="methodo-pillar-sub">2 questions d'enquête, normalisées 0→10</div>
                  <p>
                    Une question d'évaluation (satisfaction, confiance, sentiment)
                    et une question d'expérience vécue (incidents, renoncements,
                    usages). Les réponses sont agrégées à la maille commune par
                    redressement démographique.
                  </p>
                </div>
                <div className="methodo-pillar methodo-pillar--data">
                  <div className="methodo-pillar-title">Note Data</div>
                  <div className="methodo-pillar-sub">2 variables open data, normalisées 0→10</div>
                  <p>
                    Une variable de <em>stock ou de niveau</em> (densité
                    d'équipements, revenu médian, taux de couverture) et une
                    variable de <em>qualité ou de tension</em> (taux d'incidents,
                    passoires thermiques, écart). Sources : INSEE, DVF, Filosofi,
                    SSMSI, DEPP, OFGL, Arcep, Ademe, BPE, etc.
                  </p>
                </div>
              </div>
              <div className="methodo-formula">
                <div><strong>Score</strong> = (Note Opinion + Note Data) ÷ 2&nbsp;&nbsp;→&nbsp;&nbsp;échelle 0 à 10</div>
                <div><strong>Écart perception / réalité</strong> = Note Opinion − Note Data&nbsp;&nbsp;→&nbsp;&nbsp;−10 à +10</div>
                <div><strong>Classe</strong> : A (≥ 7,5) · B (≥ 6) · C (≥ 4) · D (&lt; 4)</div>
              </div>
            </div>

            {/* ─── 3. Les 9 indicateurs ─── */}
            <div className="methodo-block">
              <div className="methodo-label">3 · Les 9 indicateurs, leurs questions et leurs sources</div>
              <div className="methodo-table-wrap">
                <table className="methodo-table">
                  <thead>
                    <tr>
                      <th>Indicateur</th>
                      <th>Questions d'opinion</th>
                      <th>Variables data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {INDICATORS.map(ind => (
                      <tr key={ind.id}>
                        <td>
                          <span className="methodo-ind">
                            <span className="dot" style={{ background: ind.color }} />
                            {ind.icon} {ind.name}
                          </span>
                        </td>
                        <td>
                          <div>• {ind.q1}</div>
                          <div>• {ind.q2}</div>
                        </td>
                        <td>
                          <div>{ind.d1} <span className="methodo-src">({ind.d1_src})</span></div>
                          {ind.d2 !== '—' && (
                            <div>{ind.d2} <span className="methodo-src">({ind.d2_src})</span></div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ─── 4. Le traitement des données open data ─── */}
            <div className="methodo-block">
              <div className="methodo-label">4 · Chaîne de traitement des données open data</div>
              <ol className="methodo-ol">
                <li>
                  <strong>Collecte.</strong> 18 sources publiques de référence
                  (INSEE RP, DVF, Filosofi, SSMSI, DEPP, OFGL, Ministère de
                  l'Intérieur, Arcep, Ademe, BPE, DREES, France Travail,
                  Géorisques, ONISR, SDES, SIRENE, Cerema, Data Inclusion).
                </li>
                <li>
                  <strong>Harmonisation.</strong> Rattachement au <em>code
                  commune INSEE</em> officiel, réconciliation des fusions /
                  scissions, correction des codes Paris / Lyon / Marseille par
                  arrondissement.
                </li>
                <li>
                  <strong>Normalisation.</strong> Chaque variable est transformée
                  en rang percentile national, puis convertie sur une échelle
                  0→10. Les variables « négatives » (ex. taux de crimes, passoires
                  thermiques) sont inversées afin que 10 représente toujours une
                  situation favorable.
                </li>
                <li>
                  <strong>Agrégation.</strong> Les deux variables data d'un
                  indicateur sont pondérées à parts égales pour produire la
                  <em> Note Data</em>.
                </li>
                <li>
                  <strong>Couverture.</strong> 34 931 communes métropolitaines
                  et d'outre-mer, avec fallback département / région quand la
                  donnée communale est manquante pour garantir une carte lisible.
                </li>
              </ol>
            </div>

            {/* ─── 5. Ce démonstrateur ─── */}
            <div className="methodo-block methodo-block--demo">
              <div className="methodo-label">5 · Ce que démontre cette démo</div>
              <div className="methodo-demo-grid">
                <div>
                  <div className="methodo-dot methodo-dot--real" />
                  <strong>Données open data — réelles</strong>
                  <p>
                    Toutes les <em>Notes Data</em> affichées reposent sur des
                    traitements effectifs des 18 sources publiques listées
                    ci-dessus. La couche objective est donc déjà pleinement
                    opérationnelle et rejouable.
                  </p>
                </div>
                <div>
                  <div className="methodo-dot methodo-dot--sim" />
                  <strong>Données d'opinion — simulées</strong>
                  <p>
                    En l'absence d'étude ad hoc, la <em>Note Opinion</em> est
                    générée par un modèle de simulation calibré : distribution
                    réaliste autour de la Note Data, bruit contrôlé pour
                    matérialiser les écarts perception / réalité, et corrélations
                    inter-indicateurs plausibles. Ces valeurs ne doivent
                    <strong> pas </strong>être interprétées comme représentatives
                    d'une commune donnée — elles servent à éprouver la
                    mécanique et l'expérience utilisateur.
                  </p>
                </div>
                <div>
                  <div className="methodo-dot methodo-dot--interact" />
                  <strong>Interactions — pleinement fonctionnelles</strong>
                  <p>
                    Carte MapLibre, recherche, géocodage, comparateur jusqu'à
                    4 communes, fiches détaillées, histogrammes, classements,
                    vote d'insight. Tout ce qui sera utilisé avec la donnée
                    réelle est déjà en place.
                  </p>
                </div>
              </div>
            </div>

            {/* ─── 6. Avec une étude ad hoc ─── */}
            <div className="methodo-block methodo-block--vision">
              <div className="methodo-label">6 · La puissance réelle : avec une étude d'opinion ad hoc</div>
              <p className="methodo-vision-lede">
                Cette maquette n'est qu'un aperçu. <strong>Branchée sur une
                vraie étude ad hoc</strong> — échantillon redressé, questions
                calibrées par indicateur, maille commune / EPCI / département —
                Nuances de France devient un outil d'une puissance inédite :
              </p>
              <ul className="methodo-vision-list">
                <li>
                  <strong>Cartographier le ressenti réel</strong> des Français,
                  commune par commune, avec un niveau de granularité et
                  d'actualité qu'aucun baromètre national ne permet aujourd'hui.
                </li>
                <li>
                  <strong>Révéler les écarts perception / réalité</strong> qui
                  font ou défont un mandat local : là où la donnée dit « ça va »
                  mais où les habitants disent l'inverse — et réciproquement.
                </li>
                <li>
                  <strong>Prioriser l'action publique</strong> en identifiant
                  les territoires où un même score cache des ressorts très
                  différents (manque d'équipement, défiance, isolement…).
                </li>
                <li>
                  <strong>Suivre dans le temps</strong> l'effet des politiques
                  menées : réitérer l'enquête permet de mesurer un <em>avant /
                  après</em> opinion en regard de l'évolution des indicateurs
                  objectifs.
                </li>
                <li>
                  <strong>Comparer</strong> une commune à ses pairs (strates de
                  population, typologie rurale/urbaine, département),
                  argumenter en conseil municipal ou en campagne avec des
                  données chiffrées et visuelles.
                </li>
                <li>
                  <strong>Dialoguer avec les citoyens</strong> : la carte
                  devient un support de concertation, un miroir partagé entre
                  élus, techniciens et habitants.
                </li>
              </ul>
              <p className="methodo-vision-close">
                L'infrastructure technique, la chaîne data et l'expérience
                utilisateur sont prêtes. <strong>Il ne manque que la voix des
                citoyens, collectée dans les règles de l'art par une étude
                d'opinion dédiée, pour transformer ce démonstrateur en outil de
                pilotage territorial à l'échelle nationale.</strong>
              </p>
            </div>

            <div className="methodo-foot">
              Sources documentaires : fichier maître PNYX (212 bases, 18 sources
              couvertes automatiquement), audit de convergence, spécification
              des 9 indicateurs.
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
