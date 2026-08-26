import { Routes, Route } from 'react-router-dom'
import { SetupCheck } from './routes/SetupCheck'

function App() {
  return (
    <Routes>
      <Route path="/" element={<SetupCheck />} />
    </Routes>
  )
}

export default App
