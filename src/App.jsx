import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './ui/ToastProvider.jsx'
import FoundationPage from './pages/FoundationPage.jsx'
import LandingPage from './pages/LandingPage.jsx'

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/foundation" element={<FoundationPage />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}
