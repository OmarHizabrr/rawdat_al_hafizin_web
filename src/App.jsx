import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider.jsx'
import { PermissionsProvider } from './context/PermissionsProvider.jsx'
import { SiteContentProvider } from './context/SiteContentProvider.jsx'
import { ThemeProvider } from './theme/ThemeProvider.jsx'
import { AdminRoute } from './routes/AdminRoute.jsx'
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
import ExplorePlansPage from './pages/ExplorePlansPage.jsx'
import HalakatPage from './pages/HalakatPage.jsx'
import ExploreHalakatPage from './pages/ExploreHalakatPage.jsx'
import DawratPage from './pages/DawratPage.jsx'
import ExploreDawratPage from './pages/ExploreDawratPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import WelcomePage from './pages/WelcomePage.jsx'
import AdminUsersPage from './pages/AdminUsersPage.jsx'
import AdminDashboardPage from './pages/AdminDashboardPage.jsx'
import AdminPlanTypesPage from './pages/AdminPlanTypesPage.jsx'
import AdminSiteCopyPage from './pages/AdminSiteCopyPage.jsx'
import AdminBrandingPage from './pages/AdminBrandingPage.jsx'
import AdminUserTypesPage from './pages/AdminUserTypesPage.jsx'
import { PageGuard } from './routes/PageGuard.jsx'

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <SiteContentProvider>
          <AuthProvider>
            <PermissionsProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<GuestOnly />}>
                  <Route path="/" element={<LandingPage />} />
                </Route>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/foundation" element={<FoundationPage />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="/app" element={<MainLayout />}>
                    <Route index element={<PageGuard pageId="home"><AppHomePage /></PageGuard>} />
                    <Route path="welcome" element={<PageGuard pageId="welcome"><WelcomePage /></PageGuard>} />
                    <Route path="plans/explore" element={<PageGuard pageId="plans_explore"><ExplorePlansPage /></PageGuard>} />
                    <Route path="plans" element={<PageGuard pageId="plans"><PlansPage /></PageGuard>} />
                    <Route path="halakat/explore" element={<PageGuard pageId="halakat_explore"><ExploreHalakatPage /></PageGuard>} />
                    <Route path="halakat" element={<PageGuard pageId="halakat"><HalakatPage /></PageGuard>} />
                    <Route path="dawrat/explore" element={<PageGuard pageId="dawrat_explore"><ExploreDawratPage /></PageGuard>} />
                    <Route path="dawrat" element={<PageGuard pageId="dawrat"><DawratPage /></PageGuard>} />
                    <Route path="awrad" element={<PageGuard pageId="awrad"><AwradPage /></PageGuard>} />
                    <Route path="foundation" element={<PageGuard pageId="foundation"><FoundationPage /></PageGuard>} />
                    <Route path="settings" element={<PageGuard pageId="settings"><SettingsPage /></PageGuard>} />
                    <Route element={<AdminRoute />}>
                      <Route path="admin" element={<AdminDashboardPage />} />
                      <Route path="admin/plan-types" element={<AdminPlanTypesPage />} />
                      <Route path="admin/copy" element={<AdminSiteCopyPage />} />
                      <Route path="admin/branding" element={<AdminBrandingPage />} />
                      <Route path="admin/user-types" element={<AdminUserTypesPage />} />
                      <Route path="admin/users" element={<AdminUsersPage />} />
                    </Route>
                  </Route>
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
            </PermissionsProvider>
          </AuthProvider>
        </SiteContentProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
