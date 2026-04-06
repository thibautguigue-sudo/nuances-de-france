import { useState, useEffect } from 'react'
import { db, collection, addDoc, onSnapshot, query, where } from '../firebase'

const OPTIONS = [
  { value: 1, label: 'Très satisfait', emoji: '😊' },
  { value: 2, label: 'Plutôt satisfait', emoji: '🙂' },
  { value: 3, label: 'Plutôt insatisfait', emoji: '😐' },
  { value: 4, label: 'Très insatisfait', emoji: '😟' },
]

function getAnonId() {
  let id = localStorage.getItem('nuances_anon_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('nuances_anon_id', id)
  }
  return id
}

export function InsightVote({ indicator, communeCode }) {
  const storageKey = `vote_${indicator.id}_${communeCode || 'national'}`
  const [voted, setVoted] = useState(false)
  const [results, setResults] = useState({})
  const [total, setTotal] = useState(0)

  useEffect(() => {
    setVoted(!!localStorage.getItem(storageKey))
  }, [storageKey])

  useEffect(() => {
    if (!db) return
    const q = query(
      collection(db, 'votes'),
      where('indicateur', '==', indicator.id),
      where('commune_code', '==', communeCode || 'national')
    )
    return onSnapshot(q, (snap) => {
      const counts = {}
      snap.forEach(doc => {
        const r = doc.data().reponse
        counts[r] = (counts[r] || 0) + 1
      })
      setResults(counts)
      setTotal(snap.size)
    })
  }, [indicator.id, communeCode])

  async function vote(value) {
    if (voted) return
    if (!db) {
      localStorage.setItem(storageKey, '1')
      setVoted(true)
      return
    }
    try {
      await addDoc(collection(db, 'votes'), {
        indicateur: indicator.id,
        commune_code: communeCode || 'national',
        reponse: value,
        timestamp: new Date(),
        user_id_anonymous: getAnonId(),
      })
      localStorage.setItem(storageKey, '1')
      setVoted(true)
    } catch (e) {
      console.error('Vote failed:', e)
    }
  }

  return (
    <div className="insight-vote">
      <div className="section-label">Votre avis</div>
      <p className="insight-question">{indicator.q1}</p>

      {!voted ? (
        <div className="vote-options">
          {OPTIONS.map(o => (
            <button key={o.value} className="vote-btn" onClick={() => vote(o.value)}>
              <span className="vote-emoji">{o.emoji}</span>
              {o.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="vote-results">
          {OPTIONS.map(o => {
            const count = results[o.value] || 0
            const pct = total > 0 ? Math.round((count / total) * 100) : 0
            return (
              <div key={o.value} className="vote-bar-row">
                <span className="vote-label">{o.emoji} {o.label}</span>
                <div className="vote-bar-track">
                  <div className="vote-bar-fill" style={{ width: `${pct}%`, background: indicator.color }} />
                </div>
                <span className="vote-pct">{pct}%</span>
              </div>
            )
          })}
          <p className="vote-total">{total} vote{total !== 1 ? 's' : ''}</p>
          {!db && <p className="vote-note">Firebase non configuré — votes stockés localement</p>}
        </div>
      )}
    </div>
  )
}
