import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'
import { INDICATORS, SCORE_COLORS, scoreToColor, buildColorExpr } from '../constants'
import { RadarChart, BarChart, GaugeChart } from '../components/Charts'
import { ComparisonPanel } from '../components/ComparisonPanel'
import { InsightVote } from '../components/InsightVote'
import DataWorker from '../dataWorker.js?worker'

let pmtilesAdded = false

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

export default function HomePage() {
  const [searchParams] = useSearchParams()
  const [loadPhase, setLoadPhase] = useState('loading') // loading, ready
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('Chargement des departements...')
  const [deptGeo, setDeptGeo] = useState(null)
  const [communesGeo, setCommunesGeo] = useState(null)
  const [scores, setScores] = useState(null)
  const [centroids, setCentroids] = useState(null)
  const [deptData, setDeptData] = useState(null)
  const [currentInd, setCurrentInd] = useState('securite')
  const [selectedCommune, setSelectedCommune] = useState(null)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [geocodeResults, setGeoCodeResults] = useState([])
  const [compareCodes, setCompareCodes] = useState([])
  const mapRef = useRef(null)
  const mapInst = useRef(null)
  const communesLoaded = useRef(false)
  const currentIndRef = useRef(currentInd)
  currentIndRef.current = currentInd

  // Parse ?compare= from URL
  useEffect(() => {
    const cmp = searchParams.get('compare')
    if (cmp) setCompareCodes(cmp.split(',').slice(0, 4))
  }, [searchParams])

  // ─── Progressive data loading via Web Worker ───
  useEffect(() => {
    let alive = true
    const worker = new DataWorker()

    async function load() {
      // Step 1: departements (588KB) — show map fast
      setProgress(0)
      setProgressLabel('Chargement des departements...')
      const dept = await workerFetch(worker, '/data/departements.json')
      if (!alive) return
      setDeptGeo(dept)
      setDeptData(dept)
      setProgress(25)

      // Step 2: scores (7.7MB) — enrich map with data
      setProgressLabel('Chargement des scores communes...')
      const scr = await workerFetch(worker, '/data/communes_scores.json')
      if (!alive) return
      setScores(scr)
      setProgress(50)

      // Step 3: centroids (841KB)
      setProgressLabel('Chargement des centroides...')
      const cents = await workerFetch(worker, '/data/communes_centroids.json')
      if (!alive) return
      setCentroids(cents)
      setProgress(75)

      // Step 4: communes geo (8.7MB) — heaviest, last
      setProgressLabel('Chargement haute resolution des 34 931 communes...')
      try {
        const geo = await workerFetch(worker, '/data/communes-france.geojson')
        if (!alive) return
        setCommunesGeo(geo)
      } catch { /* non-blocking */ }
      setProgress(100)
      setLoadPhase('ready')
    }
    load()

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    return () => { alive = false; worker.terminate() }
  }, [])

  // ─── Initialize map with départements ───
  useEffect(() => {
    if (!deptGeo || !scores || mapInst.current) return

    if (!pmtilesAdded) {
      const protocol = new Protocol()
      maplibregl.addProtocol('pmtiles', protocol.tile)
      pmtilesAdded = true
    }

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: {
        version: 8,
        sources: {
          carto: {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
              'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '© CARTO © OpenStreetMap contributors',
          }
        },
        layers: [
          { id: 'background', type: 'background', paint: { 'background-color': '#f0ebe0' } },
          { id: 'carto-tiles', type: 'raster', source: 'carto', paint: { 'raster-opacity': 0.5 } },
        ]
      },
      center: [2.5, 46.5],
      zoom: 5.5,
      maxBounds: [[-6, 40], [11, 52]],
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')

    map.on('load', () => {
      // Départements layer (shown first, fast)
      const deptEnriched = {
        ...deptGeo,
        features: deptGeo.features.map(f => {
          const d = f.properties.d?.[currentInd]
          return { ...f, properties: { ...f.properties, score: d?.s ?? null } }
        })
      }
      map.addSource('departements', { type: 'geojson', data: deptEnriched })
      map.addLayer({
        id: 'dept-line', type: 'line', source: 'departements',
        paint: { 'line-color': '#444', 'line-width': 2, 'line-opacity': 0.7 }
      })

      // Highlight layer for selected commune
      map.addSource('highlight', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({
        id: 'highlight-line', type: 'line', source: 'highlight',
        paint: { 'line-color': '#FFD700', 'line-width': 3, 'line-opacity': 1 }
      })

      mapInst.current = map
    })

    return () => map.remove()
  }, [deptGeo, scores])

  // ─── Add communes when loaded ───
  useEffect(() => {
    const map = mapInst.current
    if (!map || !communesGeo || !scores || communesLoaded.current) return
    if (!map.isStyleLoaded()) {
      map.once('idle', () => addCommunesLayer(map))
    } else {
      addCommunesLayer(map)
    }
  }, [communesGeo, scores])

  function addCommunesLayer(map) {
    if (communesLoaded.current) return
    const enriched = {
      ...communesGeo,
      features: communesGeo.features.map(f => {
        const code = f.properties.code
        const d = scores[code]
        const props = { c: code, n: d?.n || f.properties.nom || '' }
        if (d) {
          for (const ind of INDICATORS) {
            if (d[ind.id]) {
              props[`${ind.id}_s`] = d[ind.id].s ?? null
              props[`${ind.id}_c`] = d[ind.id].c || ''
              props[`${ind.id}_e`] = d[ind.id].e ?? null
            }
          }
        }
        return { ...f, properties: props }
      })
    }

    map.addSource('communes', {
      type: 'geojson',
      data: enriched,
      generateId: true,
      tolerance: 0,
    })
    map.addLayer({
      id: 'communes-fill', type: 'fill', source: 'communes',
      paint: { 'fill-color': buildColorExpr(currentIndRef.current), 'fill-opacity': 0.5 }
    }, 'highlight-line')
    map.addLayer({
      id: 'communes-line', type: 'line', source: 'communes',
      paint: {
        'line-color': 'rgba(100,100,100,0.3)',
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.3, 12, 0.8],
      }
    }, 'highlight-line')
    map.addLayer({
      id: 'communes-hover-line', type: 'line', source: 'communes',
      paint: {
        'line-color': '#222',
        'line-width': 2,
        'line-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 1, 0]
      }
    }, 'highlight-line')

    // Hover on communes
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, maxWidth: '280px' })
    let hoveredCommuneId = null

    map.on('mousemove', 'communes-fill', (e) => {
      if (!e.features.length) return
      map.getCanvas().style.cursor = 'pointer'
      const feat = e.features[0]
      if (hoveredCommuneId !== null && hoveredCommuneId !== feat.id) {
        map.setFeatureState({ source: 'communes', id: hoveredCommuneId }, { hover: false })
      }
      hoveredCommuneId = feat.id
      map.setFeatureState({ source: 'communes', id: hoveredCommuneId }, { hover: true })
      const p = feat.properties
      const name = p.n || p.c
      const curInd = currentIndRef.current
      const score = p[`${curInd}_s`]
      const classe = p[`${curInd}_c`]
      let html = `<div style="font-family:'Prima Sans','DM Sans',sans-serif;font-size:13px">
        <strong>${name}</strong><br><span style="color:#888">${p.c}</span>`
      if (score != null) {
        html += `<br><span style="font-size:20px;font-weight:700;color:${scoreToColor(score)}">${score}</span>
          <span style="color:#888">/10</span>
          <span class="badge badge-${classe}" style="margin-left:6px;font-size:11px;padding:1px 6px;border-radius:4px">${classe}</span>`
      }
      html += '</div>'
      popup.setLngLat(e.lngLat).setHTML(html).addTo(map)
    })

    map.on('mouseleave', 'communes-fill', () => {
      map.getCanvas().style.cursor = ''
      popup.remove()
      if (hoveredCommuneId !== null) {
        map.setFeatureState({ source: 'communes', id: hoveredCommuneId }, { hover: false })
        hoveredCommuneId = null
      }
    })

    // Click: select or compare (shift+click)
    map.on('click', 'communes-fill', (e) => {
      if (!e.features.length) return
      const code = e.features[0].properties.c
      if (e.originalEvent.shiftKey) {
        setCompareCodes(prev => {
          if (prev.includes(code)) return prev.filter(c => c !== code)
          if (prev.length >= 4) return prev
          return [...prev, code]
        })
      } else {
        selectCommune(code)
      }
    })

    communesLoaded.current = true
  }

  // ─── Update colors on indicator change ───
  useEffect(() => {
    const map = mapInst.current
    if (!map || !scores) return

    // Update départements (~100 features, OK to rebuild)
    if (deptGeo && map.getSource('departements')) {
      const updated = {
        ...deptGeo,
        features: deptGeo.features.map(f => {
          const d = f.properties.d?.[currentInd]
          return { ...f, properties: { ...f.properties, score: d?.s ?? null } }
        })
      }
      map.getSource('departements').setData(updated)
    }

    // Update communes: just repaint, no data rebuild
    if (map.getLayer('communes-fill')) {
      map.setPaintProperty('communes-fill', 'fill-color', buildColorExpr(currentInd))
    }
  }, [currentInd, scores, deptGeo])

  // ─── Search communes ───
  useEffect(() => {
    if (!scores || search.length < 2) {
      setSearchResults([])
      return
    }
    const q = search.toLowerCase()
    const results = Object.entries(scores)
      .filter(([code, d]) => d.n?.toLowerCase().includes(q) || code.includes(q))
      .slice(0, 8)
      .map(([code, d]) => ({ code, name: d.n, type: 'commune' }))
    setSearchResults(results)
  }, [search, scores])

  // ─── Geocoder (Photon API) ───
  useEffect(() => {
    if (search.length < 3) { setGeoCodeResults([]); return }
    const ctrl = new AbortController()
    const timer = setTimeout(() => {
      fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(search)}&lang=fr&limit=3&osm_tag=place`, { signal: ctrl.signal })
        .then(r => r.json())
        .then(data => {
          const results = (data.features || []).map(f => ({
            name: f.properties.name,
            city: f.properties.city || f.properties.county || '',
            lng: f.geometry.coordinates[0],
            lat: f.geometry.coordinates[1],
            type: 'address'
          }))
          setGeoCodeResults(results)
        })
        .catch(() => {})
    }, 400)
    return () => { clearTimeout(timer); ctrl.abort() }
  }, [search])

  // ─── Select commune ───
  const selectCommune = useCallback((code) => {
    if (!scores[code]) return
    setSelectedCommune({ code, ...scores[code] })
    setSearch('')
    setSearchResults([])
    setGeoCodeResults([])

    const map = mapInst.current
    if (!map) return

    // Fly to centroid
    if (centroids?.[code]) {
      map.flyTo({ center: centroids[code], zoom: 8.5, duration: 1500 })
    }

    // Highlight polygon
    if (communesGeo) {
      const feat = communesGeo.features.find(f =>
        f.properties.code === code
      )
      if (feat && map.getSource('highlight')) {
        map.getSource('highlight').setData({ type: 'FeatureCollection', features: [feat] })
      }
    }
  }, [scores, centroids, communesGeo])

  const flyToGeocode = useCallback((result) => {
    const map = mapInst.current
    if (!map) return
    map.flyTo({ center: [result.lng, result.lat], zoom: 13, duration: 1500 })
    setSearch('')
    setSearchResults([])
    setGeoCodeResults([])
  }, [])

  // ─── Compute averages for BarChart ───
  const nationalAvg = scores ? (() => {
    const vals = Object.values(scores).map(d => d[currentInd]?.s).filter(s => s != null)
    return vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null
  })() : null

  const deptAvgForCommune = (commune) => {
    if (!scores || !commune?.code) return null
    const deptCode = commune.code.slice(0, 2)
    const vals = Object.entries(scores)
      .filter(([c]) => c.startsWith(deptCode))
      .map(([, d]) => d[currentInd]?.s)
      .filter(s => s != null)
    return vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null
  }

  const ind = INDICATORS.find(i => i.id === currentInd)

  const showProgress = loadPhase !== 'ready'

  return (
    <>
      {/* Progress bar */}
      {showProgress && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
          <span className="progress-text">
            {progressLabel} {progress}%
          </span>
        </div>
      )}

      {/* HERO */}
      <div className="hero">
        <div className="hero-inner">
          <div>
            <h1 className="serif"><strong>OSER.</strong></h1>
            <h1 className="serif" style={{ fontWeight: 400, fontSize: 'clamp(1.3rem, 2.5vw, 2rem)', marginTop: 4 }}>Nuances de France</h1>
            <p className="sub">Opinion citoyenne x donnees publiques — 34 931 communes, 9 indicateurs, territoire par territoire.</p>
          </div>
          <div className="stats">
            <div><div className="stat-v">9</div><div className="stat-l">Indicateurs</div></div>
            <div><div className="stat-v">34 931</div><div className="stat-l">Communes</div></div>
            <div><div className="stat-v">18</div><div className="stat-l">Sources data</div></div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="section">
          {/* INDICATOR BAR */}
          <div className="ind-bar">
            {INDICATORS.map(i => (
              <button key={i.id} className={`ind-btn${i.id === currentInd ? ' active' : ''}`}
                onClick={() => setCurrentInd(i.id)}>
                <span className="dot" style={{ background: i.color }} />
                {i.name}
              </button>
            ))}
          </div>

          {/* Comparison mode toggle */}
          {compareCodes.length > 0 && (
            <ComparisonPanel
              codes={compareCodes}
              scores={scores}
              onRemove={(code) => setCompareCodes(prev => prev.filter(c => c !== code))}
              onClose={() => setCompareCodes([])}
            />
          )}

          {/* MAP + SIDE PANEL */}
          <div className="map-layout">
            <div className="map-wrapper">
              <div className="map-header">
                <div className="map-title serif">{ind.icon} {ind.name}</div>
                <div className="map-hint">Shift+clic pour comparer</div>
              </div>
              <div className="map-subtitle">Score composite par commune — survolez et cliquez pour détailler</div>
              <div id="map" ref={mapRef} />
              <div className="legend">
                {SCORE_COLORS.map(([threshold, color], i) => (
                  <div className="legend-item" key={i}>
                    <div className="legend-swatch" style={{ background: color }} />
                    {i === 0 ? `< ${SCORE_COLORS[1]?.[0] || 3}` :
                     i === SCORE_COLORS.length - 1 ? `>= ${threshold}` :
                     `${threshold}-${SCORE_COLORS[i + 1]?.[0]}`}
                  </div>
                ))}
                <div className="legend-item">
                  <div className="legend-swatch" style={{ background: '#E8E7E2' }} />
                  N/D
                </div>
              </div>
            </div>

            {/* SIDE PANEL */}
            <div className="side-panel">
              {/* Search + geocoder */}
              <div className="search-box">
                <input type="text" placeholder="Rechercher une commune ou adresse..."
                  value={search} onChange={e => setSearch(e.target.value)} />
                {(searchResults.length > 0 || geocodeResults.length > 0) && (
                  <div className="search-results">
                    {searchResults.map(r => (
                      <div key={r.code} className="search-item" onClick={() => selectCommune(r.code)}>
                        {r.name} <span style={{ color: '#999', fontSize: '.8em' }}>({r.code})</span>
                      </div>
                    ))}
                    {geocodeResults.length > 0 && searchResults.length > 0 && (
                      <div className="search-divider">Adresses</div>
                    )}
                    {geocodeResults.map((r, i) => (
                      <div key={i} className="search-item search-geo" onClick={() => flyToGeocode(r)}>
                        {r.name} {r.city && <span style={{ color: '#999', fontSize: '.8em' }}>({r.city})</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedCommune ? (
                <CommuneDetail
                  commune={selectedCommune}
                  indicator={currentInd}
                  nationalAvg={nationalAvg}
                  deptAvg={deptAvgForCommune(selectedCommune)}
                  onChangeInd={setCurrentInd}
                  onBack={() => {
                    setSelectedCommune(null)
                    if (mapInst.current?.getSource('highlight')) {
                      mapInst.current.getSource('highlight').setData({ type: 'FeatureCollection', features: [] })
                    }
                  }}
                />
              ) : (
                <NationalSummary scores={scores} indicator={currentInd} onSelect={selectCommune} />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="footer">
        <p>Produit par <strong>PNYX 2.0</strong> pour <strong>OSER.</strong></p>
        <p style={{ marginTop: 6, opacity: .5 }}>MVP — Données d'enquete simulees / Données open data reelles / 34 931 communes</p>
      </div>
    </>
  )
}

// ─── National Summary ───
function NationalSummary({ scores, indicator, onSelect }) {
  const ind = INDICATORS.find(i => i.id === indicator)
  if (!scores) return null

  const allScores = Object.entries(scores)
    .map(([code, d]) => ({ code, name: d.n, s: d[indicator]?.s, c: d[indicator]?.c }))
    .filter(d => d.s != null)
    .sort((a, b) => b.s - a.s)

  const avg = allScores.length
    ? (allScores.reduce((a, b) => a + b.s, 0) / allScores.length).toFixed(1)
    : '—'

  return (
    <>
      <h3 className="serif">{ind.icon} {ind.name}</h3>
      <p className="dept-name">Vue nationale — {allScores.length.toLocaleString('fr')} communes avec données</p>
      <div className="metric-row">
        <span className="metric-label">Score moyen</span>
        <span className="metric-val" style={{ color: ind.color }}>{avg}<span style={{ fontSize: '.6em', color: '#999' }}>/10</span></span>
      </div>
      <div className="section-label">Top 10 communes</div>
      {allScores.slice(0, 10).map(d => (
        <div key={d.code} className="commune-row" onClick={() => onSelect(d.code)}>
          <span>{d.name}</span>
          <span className={`badge badge-${d.c}`}>{d.s}</span>
        </div>
      ))}
      <div className="section-label">10 dernieres</div>
      {allScores.slice(-10).reverse().map(d => (
        <div key={d.code} className="commune-row" onClick={() => onSelect(d.code)}>
          <span>{d.name}</span>
          <span className={`badge badge-${d.c}`}>{d.s}</span>
        </div>
      ))}
    </>
  )
}

// ─── Commune Detail (with charts) ───
function CommuneDetail({ commune, indicator, nationalAvg, deptAvg, onChangeInd, onBack }) {
  const ind = INDICATORS.find(i => i.id === indicator)
  const data = commune[indicator]
  const [showDetail, setShowDetail] = useState(false)

  const noteOpinion = data ? +(data.s + data.e / 2).toFixed(1) : null
  const noteData = data ? +(data.s - data.e / 2).toFixed(1) : null

  return (
    <>
      <h3 className="serif">{commune.n || commune.code}</h3>
      <p className="dept-name">Code commune : {commune.code}</p>

      {/* Gauge Chart */}
      {data && (
        <div className="chart-center">
          <GaugeChart score={data.s} classe={data.c} color={ind.color} />
        </div>
      )}

      {data ? (
        <>
          <div className="metric-row">
            <span className="metric-label">Score {ind.name}</span>
            <span className="metric-val" style={{ color: ind.color }}>
              {data.s}<span style={{ fontSize: '.6em', color: '#999' }}>/10</span>
            </span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Écart perception/réalité</span>
            <span className="metric-val" style={{ color: data.e > 0 ? '#185FA5' : '#993C1D' }}>
              {data.e > 0 ? '+' : ''}{data.e}
            </span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Classe</span>
            <span className={`badge badge-${data.c}`}>{data.c}</span>
          </div>

          {/* Détail du calcul */}
          <button onClick={() => setShowDetail(v => !v)} style={{
            background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer',
            color: '#999', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 4
          }}>
            <span style={{ transform: showDetail ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform .15s' }}>▶</span>
            Voir le détail du calcul
          </button>
          {showDetail && (
            <div style={{ background: '#F7F6F2', borderRadius: 6, padding: '10px 12px', fontSize: '12px', color: '#555', marginBottom: 8 }}>
              <div style={{ marginBottom: 4 }}><strong>Note Opinion :</strong> {noteOpinion}/10</div>
              <div style={{ marginBottom: 4 }}><strong>Note Data :</strong> {noteData}/10</div>
              <div style={{ marginBottom: 8, color: '#888', fontStyle: 'italic' }}>
                Score = ({noteOpinion} + {noteData}) / 2 = {data.s} &nbsp;·&nbsp; Écart = {noteOpinion} − {noteData} = {data.e > 0 ? '+' : ''}{data.e}
              </div>
              <div style={{ borderTop: '1px solid #E8E7E2', paddingTop: 6, marginBottom: 4 }}>
                <div><strong>Q1 :</strong> {ind.q1}</div>
                <div><strong>Q2 :</strong> {ind.q2}</div>
              </div>
              <div style={{ borderTop: '1px solid #E8E7E2', paddingTop: 6 }}>
                <div><strong>Source data 1 :</strong> {ind.d1} <span style={{ color: '#aaa' }}>({ind.d1_src})</span></div>
                {ind.d2 !== '—' && <div><strong>Source data 2 :</strong> {ind.d2} <span style={{ color: '#aaa' }}>({ind.d2_src})</span></div>}
              </div>
            </div>
          )}

          {/* Bar Chart: commune vs national vs dept */}
          <div className="section-label">Comparaison</div>
          <div className="chart-center">
            <BarChart communeScore={data.s} nationalAvg={nationalAvg} deptAvg={deptAvg} color={ind.color} />
          </div>
        </>
      ) : (
        <p style={{ color: '#999', padding: '16px 0' }}>Données non disponibles pour cet indicateur.</p>
      )}

      {/* Radar Chart */}
      <div className="section-label">Profil global</div>
      <div className="chart-center">
        <RadarChart commune={commune} />
      </div>

      {/* Insight Vote */}
      <InsightVote indicator={ind} communeCode={commune.code} />

      <div className="section-label">Tous les indicateurs</div>
      {INDICATORS.map(i => {
        const d = commune[i.id]
        return (
          <div key={i.id} className="commune-row" onClick={() => onChangeInd(i.id)}
            style={i.id === indicator ? { background: '#E1F5EE' } : {}}>
            <span>{i.icon} {i.name}</span>
            {d ? <span className={`badge badge-${d.c}`}>{d.s}</span> : <span style={{ color: '#ccc', fontSize: '.8em' }}>—</span>}
          </div>
        )
      })}

      <button className="back-btn" onClick={onBack}>Retour vue nationale</button>
    </>
  )
}
