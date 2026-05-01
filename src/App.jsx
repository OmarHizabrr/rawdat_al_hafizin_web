import { lazy, Suspense } from 'react'
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
import { PageGuard } from './routes/PageGuard.jsx'

const LandingPage = lazy(() => import('./pages/LandingPage.jsx'))
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'))
const FoundationPage = lazy(() => import('./pages/FoundationPage.jsx'))
const AppHomePage = lazy(() => import('./pages/AppHomePage.jsx'))
const WelcomePage = lazy(() => import('./pages/WelcomePage.jsx'))
const ExplorePlansPage = lazy(() => import('./pages/ExplorePlansPage.jsx'))
const PlansPage = lazy(() => import('./pages/PlansPage.jsx'))
const ExploreHalakatPage = lazy(() => import('./pages/ExploreHalakatPage.jsx'))
const HalakatPage = lazy(() => import('./pages/HalakatPage.jsx'))
const HalakaSessionsPage = lazy(() => import('./pages/HalakaSessionsPage.jsx'))
const HalakaSessionWorkspacePage = lazy(() => import('./pages/HalakaSessionWorkspacePage.jsx'))
const RemoteTasmeePage = lazy(() => import('./pages/RemoteTasmeePage.jsx'))
const ExploreRemoteTasmeePage = lazy(() => import('./pages/ExploreRemoteTasmeePage.jsx'))
const RemoteTasmeeBroadcastPage = lazy(() => import('./pages/RemoteTasmeeBroadcastPage.jsx'))
const ExamsPage = lazy(() => import('./pages/ExamsPage.jsx'))
const ExploreExamsPage = lazy(() => import('./pages/ExploreExamsPage.jsx'))
const ExploreDawratPage = lazy(() => import('./pages/ExploreDawratPage.jsx'))
const DawratPage = lazy(() => import('./pages/DawratPage.jsx'))
const AwradPage = lazy(() => import('./pages/AwradPage.jsx'))
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'))
const LeaveRequestPage = lazy(() => import('./pages/LeaveRequestPage.jsx'))
const CertificatesPage = lazy(() => import('./pages/CertificatesPage.jsx'))
const StudentFeelingsPage = lazy(() => import('./pages/StudentFeelingsPage.jsx'))
const ApplicationRequestPage = lazy(() => import('./pages/ApplicationRequestPage.jsx'))
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage.jsx'))
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage.jsx'))
const AdminApplicationRequestsPage = lazy(() => import('./pages/AdminApplicationRequestsPage.jsx'))
const AdminPlanTypesPage = lazy(() => import('./pages/AdminPlanTypesPage.jsx'))
const AdminSiteCopyPage = lazy(() => import('./pages/AdminSiteCopyPage.jsx'))
const AdminBrandingPage = lazy(() => import('./pages/AdminBrandingPage.jsx'))
const AdminUserTypesPage = lazy(() => import('./pages/AdminUserTypesPage.jsx'))

function FullPageLazyFallback() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        padding: '2rem',
      }}
      role="status"
      aria-live="polite"
    >
      <p className="lead" style={{ color: 'var(--rh-text-muted)', margin: 0, textAlign: 'center' }}>
        جاري التحميل…
      </p>
    </div>
  )
}

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
                  <Route
                    path="/"
                    element={
                      <Suspense fallback={<FullPageLazyFallback />}>
                        <LandingPage />
                      </Suspense>
                    }
                  />
                </Route>
                <Route
                  path="/login"
                  element={
                    <Suspense fallback={<FullPageLazyFallback />}>
                      <LoginPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/foundation"
                  element={
                    <Suspense fallback={<FullPageLazyFallback />}>
                      <FoundationPage />
                    </Suspense>
                  }
                />
                <Route element={<ProtectedRoute />}>
                  <Route path="/app/application" element={<ApplicationRequestPage />} />
                  <Route path="/app" element={<MainLayout />}>
                    <Route index element={<PageGuard pageId="home"><AppHomePage /></PageGuard>} />
                    <Route path="welcome" element={<PageGuard pageId="welcome"><WelcomePage /></PageGuard>} />
                    <Route path="plans/explore" element={<PageGuard pageId="plans_explore"><ExplorePlansPage /></PageGuard>} />
                    <Route path="plans" element={<PageGuard pageId="plans"><PlansPage /></PageGuard>} />
                    <Route path="halakat/explore" element={<PageGuard pageId="halakat_explore"><ExploreHalakatPage /></PageGuard>} />
                    <Route path="halakat" element={<PageGuard pageId="halakat"><HalakatPage /></PageGuard>} />
                    <Route path="halakat/:halakaId/sessions" element={<PageGuard pageId="halakat"><HalakaSessionsPage /></PageGuard>} />
                    <Route path="halakat/:halakaId/sessions/:sessionId" element={<PageGuard pageId="halakat"><HalakaSessionWorkspacePage /></PageGuard>} />
                    <Route
                      path="remote-tasmee/explore"
                      element={
                        <PageGuard pageId="remote_tasmee_explore">
                          <ExploreRemoteTasmeePage />
                        </PageGuard>
                      }
                    />
                    <Route path="remote-tasmee" element={<PageGuard pageId="remote_tasmee"><RemoteTasmeePage /></PageGuard>} />
                    <Route path="remote-tasmee/:broadcastId" element={<RemoteTasmeeBroadcastPage />} />
                    <Route
                      path="exams/explore"
                      element={
                        <PageGuard pageId="exams_explore">
                          <ExploreExamsPage />
                        </PageGuard>
                      }
                    />
                    <Route path="exams" element={<PageGuard pageId="exams"><ExamsPage /></PageGuard>} />
                    <Route path="dawrat/explore" element={<PageGuard pageId="dawrat_explore"><ExploreDawratPage /></PageGuard>} />
                    <Route path="dawrat" element={<PageGuard pageId="dawrat"><DawratPage /></PageGuard>} />
                    <Route path="awrad" element={<PageGuard pageId="awrad"><AwradPage /></PageGuard>} />
                    <Route path="foundation" element={<PageGuard pageId="foundation"><FoundationPage /></PageGuard>} />
                    <Route
                      path="leave-request"
                      element={
                        <PageGuard pageId="leave_request">
                          <LeaveRequestPage />
                        </PageGuard>
                      }
                    />
                    <Route
                      path="certificates"
                      element={
                        <PageGuard pageId="certificates">
                          <CertificatesPage />
                        </PageGuard>
                      }
                    />
                    <Route
                      path="feelings"
                      element={
                        <PageGuard pageId="feelings">
                          <StudentFeelingsPage />
                        </PageGuard>
                      }
                    />
                    <Route path="settings" element={<PageGuard pageId="settings"><SettingsPage /></PageGuard>} />
                    <Route element={<AdminRoute />}>
                      <Route path="admin" element={<AdminDashboardPage />} />
                      <Route path="admin/applications" element={<AdminApplicationRequestsPage />} />
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
