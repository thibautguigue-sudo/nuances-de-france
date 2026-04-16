import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import maplibregl from 'maplibre-gl'
import { INDICATORS, SCORE_COLORS, scoreToColor, buildColorExpr } from '../constants'
import { Histogram } from '../components/Charts'
import { InsightVote } from '../components/InsightVote'
import DataWorker from '../dataWorker.js?worker'

// Helper: send a fetch job to the worker and return a promise
function workerFetch(worker, url) {
  const id = url
  return new Promise((resolve, reject) => {
    function handler(e) {
      if (e.data.id !== id) return
      worker.removeEventListener('message', handler)
      if (e.data.error) reject(new Error(e.data.error))
      else resolve(e.data.data)
    }
    worker.addEventListener('message', handler)
    worker.postMessage({ url, id })
  })
}

export default function IndicatorPage() {
  const { id } = useParams()
  const ind = INDICATORS.find(i => i.id === id)
  const [scores, setScores] = useState(null)
  const [communesGeo, setCommunesGeo] = useState(null)
  const [deptGeo, setDeptGeo] = useState(null)
  const [progress, setProgress] = useState(0)
  const mapRef = useRef(null)
  const mapInst = useRef(null)
  const idRef = useRef(id)
  idRef.current = id

  useEffect(() => {
    let alive = true
    const worker = new DataWorker()

    async function load() {
      // Step 1: departements (fast)
      const dept = await workerFetch(worker, '/data/departements.json')
      if (!alive) return
      setDeptGeo(dept)
      setProgress(33)

      // Step 2: scores (heavy)
      const scr = await workerFetch(worker, '/data/communes_scores.json')
      if (!alive) return
      setScores(scr)
      setProgress(66)

      // Step 3: communes geo (heaviest)
      try {
        const geo = await workerFetch(worker, '/data/communes-france.geojson')
        if (!alive) return
        setCommunesGeo(geo)
      } catch { /* non-blocking */ }
      setProgress(100)
    }
    load()

    return () => { alive = false; worker.terminate() }
  }, [])

  // ─── Map ───
  useEffect(() => {
    if (!communesGeo || !scores || !ind || mapInst.current) return

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: {
        version: 8, sources: {},
        layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#f5f5f0' } }]
      },
      center: [2.5, 46.5], zoom: 5.5,
      maxBounds: [[-6, 40], [11, 52]],
    })
    map.addControl(new maplibregl.NavigationControl(), 'top-right')

    map.on('load', () => {
      const enriched = {
        ...communesGeo,
        features: communesGeo.features.map(f => {
          const code = f.properties.code
          const d = scores[code]
          const props = { c: code, n: d?.n || f.properties.nom || '' }
          if (d) {
            for (const indDef of INDICATORS) {
              if (d[indDef.id]) {
                props[`${indDef.id}_s`] = d[indDef.id].s ?? null
                props[`${indDef.id}_c`] = d[indDef.id].c || ''
              }
            }
          }
          return { ...f, properties: props }
        })
      }
      map.addSource('communes', { type: 'geojson', data: enriched, tolerance: 0.5 })
      map.addLayer({
        id: 'communes-fill', type: 'fill', source: 'communes',
        paint: { 'fill-color': buildColorExpr(id), 'fill-opacity': 0.85 }
      })
      map.addLayer({
        id: 'communes-line', type: 'line', source: 'communes',
        paint: { 'line-color': '#fff', 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.1, 8, 0.3, 10, 0.8], 'line-opacity': 0.5 }
      })

      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, maxWidth: '260px' })
      map.on('mousemove', 'communes-fill', (e) => {
        if (!e.features.length) return
        map.getCanvas().style.cursor = 'pointer'
        const p = e.features[0].properties
        const curId = idRef.current
        const sc = p[`${curId}_s`]
        popup.setLngLat(e.lngLat).setHTML(
          `<div style="font-family:'Prima Sans','DM Sans',sans-serif;font-size:13px">
            <strong>${p.n || p.c}</strong>
            ${sc != null ? `<br><span style="font-size:18px;font-weight:700;color:${scoreToColor(sc)}">${sc}</span>/10` : ''}
          </div>`
        ).addTo(map)
      })
      map.on('mouseleave', 'communes-fill', () => { map.getCanvas().style.cursor = ''; popup.remove() })

      mapInst.current = map
    })

    return () => { map.remove(); mapInst.current = null }
  }, [communesGeo, scores])

  // Update paint when indicator changes via URL navigation
  useEffect(() => {
    const map = mapInst.current
    if (!map || !map.getLayer('communes-fill')) return
    map.setPaintProperty('communes-fill', 'fill-color', buildColorExpr(id))
  }, [id])

  if (!ind) return <div className="loading">Indicateur introuvable</div>

  const showProgress = progress < 100

  // ─── Compute stats ───
  const allScores = scores
    ? Object.entries(scores)
        .map(([code, d]) => ({ code, name: d.n, s: d[id]?.s, c: d[id]?.c }))
        .filter(d => d.s != null)
        .sort((a, b) => b.s - a.s)
    : []

  const avg = allScores.length
    ? (allScores.reduce((a, b) => a + b.s, 0) / allScores.length).toFixed(1)
    : '—'

  // Dept averages
  const deptAvgs = deptGeo?.features
    .map(f => ({ code: f.properties.c, name: f.properties.n, s: f.properties.d?.[id]?.s }))
    .filter(d => d.s != null)
    .sort((a, b) => b.s - a.s) || []

  return (
    <div className="indicator-page">
      {showProgress && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
          <span className="progress-text">Chargement des donnees... {progress}%</span>
        </div>
      )}
      <div className="indicator-topbar">
        <Link to="/" className="back-link">Carte</Link>
        <span className="indicator-title serif">{ind.icon} {ind.name}</span>
        <div className="indicator-nav">
          {INDICATORS.map(i => (
            <Link key={i.id} to={`/indicateur/${i.id}`}
              className={`ind-pill${i.id === id ? ' active' : ''}`}
              style={i.id === id ? { background: i.color } : {}}>
              {i.icon}
            </Link>
          ))}
        </div>
      </div>

      <div className="indicator-layout">
        {/* Map */}
        <div className="indicator-map-wrap">
          <div ref={mapRef} className="indicator-map" />
          <div className="legend" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.9)' }}>
            {SCORE_COLORS.map(([t, c], i) => (
              <div className="legend-item" key={i}>
                <div className="legend-swatch" style={{ background: c }} />
                {i === 0 ? `< ${SCORE_COLORS[1]?.[0]}` : i === SCORE_COLORS.length - 1 ? `>= ${t}` : `${t}-${SCORE_COLORS[i + 1]?.[0]}`}
              </div>
            ))}
          </div>
        </div>

        {/* Side content */}
        <div className="indicator-side">
          {/* Methodology */}
          <div className="indicator-card">
            <h3 className="serif">Méthodologie</h3>
            <div className="method-section">
              <div className="method-label">Questions d'enquete</div>
              <p>{ind.q1}</p>
              <p>{ind.q2}</p>
            </div>
            <div className="method-section">
              <div className="method-label">Sources data</div>
              <p>{ind.d1} <span className="method-src">({ind.d1_src})</span></p>
              {ind.d2 !== '—' && <p>{ind.d2} <span className="method-src">({ind.d2_src})</span></p>}
            </div>
            <div className="method-section">
              <div className="method-label">Formule de calcul</div>
              <p>Score = 0.5 x score_enquete + 0.5 x score_data (normalisé 0-10)</p>
            </div>
          </div>

          {/* Stats */}
          <div className="indicator-card">
            <h3 className="serif">Distribution nationale</h3>
            <div className="metric-row">
              <span className="metric-label">Score moyen</span>
              <span className="metric-val" style={{ color: ind.color }}>{avg}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Communes avec données</span>
              <span className="metric-val">{allScores.length.toLocaleString('fr')}</span>
            </div>
            {scores && <Histogram scores={scores} indicator={id} color={ind.color} />}
          </div>

          {/* Top / Bottom 20 */}
          <div className="indicator-card">
            <h3 className="serif">Top 20</h3>
            <div className="rank-list">
              {allScores.slice(0, 20).map((d, i) => (
                <div key={d.code} className="rank-row">
                  <span className="rank-num">{i + 1}</span>
                  <span className="rank-name">{d.name}</span>
                  <span className={`badge badge-${d.c}`}>{d.s}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="indicator-card">
            <h3 className="serif">20 dernieres</h3>
            <div className="rank-list">
              {allScores.slice(-20).reverse().map((d, i) => (
                <div key={d.code} className="rank-row">
                  <span className="rank-num">{allScores.length - 19 + i}</span>
                  <span className="rank-name">{d.name}</span>
                  <span className={`badge badge-${d.c}`}>{d.s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Department comparison */}
          <div className="indicator-card">
            <h3 className="serif">Par département</h3>
            <div className="rank-list">
              {deptAvgs.slice(0, 15).map((d, i) => (
                <div key={d.code} className="rank-row">
                  <span className="rank-num">{i + 1}</span>
                  <span className="rank-name">{d.name} ({d.code})</span>
                  <span style={{ color: scoreToColor(d.s), fontWeight: 600, fontSize: '.9em' }}>{d.s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Insight Vote */}
          <div className="indicator-card">
            <InsightVote indicator={ind} communeCode={null} />
          </div>
        </div>
      </div>
    </div>
  )
}
