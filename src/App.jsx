import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import IndicatorPage from './pages/IndicatorPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/indicateur/:id" element={<IndicatorPage />} />
    </Routes>
  )
}
