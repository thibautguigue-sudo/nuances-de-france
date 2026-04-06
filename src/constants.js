export const INDICATORS = [
  {id:'securite',name:'Sécurité',icon:'🛡️',color:'#C74B3B',q1:'Vous sentez-vous en sécurité dans votre commune ?',q2:'Avez-vous été témoin d\'incivilités ces 12 derniers mois ?',d1:'Taux de crimes et délits pour 1 000 hab.',d1_src:'SSMSI',d2:'Taux de violences physiques pour 1 000 hab.',d2_src:'SSMSI'},
  {id:'cadrevie',name:'Cadre de vie',icon:'🌳',color:'#2D8B5E',q1:'Êtes-vous satisfait de l\'équilibre bâti/nature ?',q2:'Avez-vous accès à un espace vert à proximité ?',d1:'% sols artificialisés',d1_src:'Cerema',d2:'Équipements sports/loisirs pour 1 000 hab.',d2_src:'BPE INSEE'},
  {id:'education',name:'Éducation',icon:'🎓',color:'#4A7FC1',q1:'Êtes-vous satisfait de la qualité des écoles ?',q2:'L\'offre de crèches et périscolaire est-elle suffisante ?',d1:'IPS moyen des écoles',d1_src:'DEPP',d2:'Nombre d\'écoles dans la commune',d2_src:'DEPP'},
  {id:'gouvernance',name:'Gouvernance',icon:'🏛️',color:'#7C6BB4',q1:'Avez-vous confiance dans la gestion municipale ?',q2:'Votre mairie est-elle transparente ?',d1:'Recettes de fonctionnement €/hab.',d1_src:'OFGL',d2:'Taux de participation municipales 2020',d2_src:'Min. Intérieur'},
  {id:'revenus',name:'Revenus',icon:'💰',color:'#D4A843',q1:'Le coût de la vie est-il supportable ici ?',q2:'Votre pouvoir d\'achat s\'est-il dégradé ?',d1:'Revenu médian par UC (€/an)',d1_src:'Filosofi',d2:'Prix médian au m² (€)',d2_src:'DVF'},
  {id:'numerique',name:'Numérique',icon:'💻',color:'#3DAED4',q1:'Êtes-vous satisfait de votre connexion internet ?',q2:'Accédez-vous facilement aux services publics en ligne ?',d1:'% couverture fibre FTTH',d1_src:'Arcep',d2:'Lieux d\'inclusion numérique pour 10 000 hab.',d2_src:'Data Inclusion'},
  {id:'energie',name:'Énergie',icon:'⚡',color:'#E68A2E',q1:'Votre commune agit-elle pour la transition énergétique ?',q2:'Subissez-vous des difficultés liées au coût de l\'énergie ?',d1:'% passoires thermiques (DPE F+G)',d1_src:'Ademe',d2:'Consommation électrique moyenne MWh/ménage',d2_src:'SDES'},
  {id:'sante',name:'Santé',icon:'❤️',color:'#D4548A',q1:'Comment jugez-vous votre bien-être au quotidien ?',q2:'Avez-vous renoncé à un soin ces 12 derniers mois ?',d1:'Médecins généralistes pour 10 000 hab.',d1_src:'BPE INSEE',d2:'Ménages d\'une personne (proxy isolement)',d2_src:'INSEE RP'},
  {id:'entreprises',name:'Entreprises',icon:'📈',color:'#5CAB7D',q1:'Votre territoire est-il dynamique en emploi/commerces ?',q2:'Est-il facile de trouver un emploi ici ?',d1:'% d\'indépendants parmi les actifs',d1_src:'INSEE RP',d2:'—',d2_src:'—'},
]

export const CLASS_COLORS = { A: '#0F6E56', B: '#6BAF8D', C: '#E8A838', D: '#C74B3B' }

export const SCORE_COLORS = [
  [0, '#C74B3B'], [3, '#E8A838'], [4, '#F0D68A'],
  [5, '#8BC9A4'], [6, '#4CAF7D'], [7.5, '#0F6E56']
]

export function scoreToColor(s) {
  if (s == null) return '#E8E7E2'
  for (let i = SCORE_COLORS.length - 1; i >= 0; i--) {
    if (s >= SCORE_COLORS[i][0]) return SCORE_COLORS[i][1]
  }
  return '#E8E7E2'
}

export function buildColorExpr(indicator) {
  const prop = indicator ? `${indicator}_s` : 'score'
  return [
    'case',
    ['==', ['get', prop], null], '#E8E7E2',
    ['>=', ['get', prop], 7.5], '#0F6E56',
    ['>=', ['get', prop], 6], '#4CAF7D',
    ['>=', ['get', prop], 5], '#8BC9A4',
    ['>=', ['get', prop], 4], '#F0D68A',
    ['>=', ['get', prop], 3], '#E8A838',
    '#C74B3B'
  ]
}
