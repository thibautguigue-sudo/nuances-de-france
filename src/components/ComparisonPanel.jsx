import { INDICATORS, scoreToColor } from '../constants'
import { RadarChart } from './Charts'

export function ComparisonPanel({ codes, scores, onRemove, onClose }) {
  if (codes.length < 2) return null

  const data = codes.map(code => ({ code, ...scores[code] }))
  const colors = ['#0F6E56', '#534AB7', '#C74B3B', '#D4A843']

  function shareUrl() {
    const url = new URL(window.location.origin)
    url.searchParams.set('compare', codes.join(','))
    navigator.clipboard.writeText(url.toString()).then(() => {
      alert('Lien copié !')
    })
  }

  return (
    <div className="comparison-panel">
      <div className="comparison-header">
        <h3 className="serif">Comparaison</h3>
        <button className="close-btn" onClick={onClose}>&times;</button>
      </div>

      <div className="comparison-legend">
        {data.map((c, i) => (
          <span key={c.code} className="comparison-tag" style={{ borderColor: colors[i % colors.length] }}>
            <span className="comparison-dot" style={{ background: colors[i % colors.length] }} />
            {c.n || c.code}
            <button className="tag-remove" onClick={() => onRemove(c.code)}>&times;</button>
          </span>
        ))}
      </div>

      <div className="comparison-radar">
        <RadarChart commune={data[0]} communes={data} size={240} />
      </div>

      <table className="comparison-table">
        <thead>
          <tr>
            <th>Indicateur</th>
            {data.map((c, i) => (
              <th key={c.code} style={{ color: colors[i % colors.length] }}>{c.n || c.code}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {INDICATORS.map(ind => {
            const vals = data.map(c => c[ind.id]?.s)
            const best = Math.max(...vals.filter(v => v != null))
            return (
              <tr key={ind.id}>
                <td>{ind.icon} {ind.name}</td>
                {data.map((c, i) => {
                  const s = c[ind.id]?.s
                  return (
                    <td key={c.code}
                      style={{ color: scoreToColor(s), fontWeight: s === best ? 700 : 400 }}>
                      {s != null ? s : '—'}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>

      <button className="share-btn" onClick={shareUrl}>
        Partager cette comparaison
      </button>
    </div>
  )
}
