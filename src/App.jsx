import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider.jsx'
import { ThemeProvider } from './theme/ThemeProvider.jsx'
import { GuestOnly } from './routes/GuestOnly.jsx'
import { ProtectedRoute } from './routes/ProtectedRoute.jsx'
import { MainLayout } from './layouts/MainLayout.jsx'
import { ToastProvider } from './ui/ToastProvider.jsx'
import AppHomePage from './pages/AppHomePage.jsx'
import FoundationPage from './pages/FoundationPage.jsx'
import LandingPage from './pages/LandingPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import AwradPage from './pages/AwradPage.jsx'
import PlansPage from './pages/PlansPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import WelcomePage from './pages/WelcomePage.jsx'

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<GuestOnly />}>
                <Route path="/" element={<LandingPage />} />
              </Route>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/foundation" element={<FoundationPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/app" element={<MainLayout />}>
                  <Route index element={<AppHomePage />} />
                  <Route path="welcome" element={<WelcomePage />} />
                  <Route path="plans" element={<PlansPage />} />
                  <Route path="awrad" element={<AwradPage />} />
                  <Route path="foundation" element={<FoundationPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
