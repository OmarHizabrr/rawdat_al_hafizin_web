import { Chrome, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { getPostLoginLandingPath } from '../utils/permissionsResolve.js'
import { signInWithGoogle, signOut } from '../services/authService.js'
import { ensureUserProfile } from '../services/userService.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { Button } from '../ui/Button.jsx'

export default function LoginPage() {
  const { branding } = useSiteContent()
  const { user, loading } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const suspendedNotice = searchParams.get('suspended') === '1'

  useEffect(() => {
    document.title = `تسجيل الدخول — ${branding.siteTitle}`
  }, [branding.siteTitle])

  if (loading) {
    return (
      <div className="rh-auth-loading" role="status">
        <div className="rh-spinner" />
        <p>جاري التحميل…</p>
      </div>
    )
  }

  if (user && user.isActive === false) {
    return (
      <div className="rh-login-page">
        <div className="rh-login-card">
          <img className="rh-login-logo" src={branding.logoSrc} alt="" width={88} height={88} />
          <h1 className="rh-login-title">الحساب موقوف</h1>
          <p className="rh-login-sub">
            تم إيقاف حسابك من قبل الإدارة. إذا كان ذلك خطأ، تواصل مع المشرف.
          </p>
          <Button
            type="button"
            variant="primary"
            icon={LogOut}
            loading={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await signOut()
                navigate('/login', { replace: true })
              } finally {
                setBusy(false)
              }
            }}
          >
            تسجيل الخروج والعودة
          </Button>
        </div>
      </div>
    )
  }

  if (user) {
    return <Navigate to={getPostLoginLandingPath(user)} replace />
  }

  const onGoogle = async () => {
    setBusy(true)
    setError('')
    try {
      const firebaseUser = await signInWithGoogle()
      const profile = await ensureUserProfile(firebaseUser)
      const forLanding = profile ? { ...firebaseUser, ...profile } : firebaseUser
      navigate(getPostLoginLandingPath(forLanding), { replace: true })
    } catch (e) {
      const code = e?.code
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setError('أُلغي نافذة تسجيل الدخول.')
      } else {
        setError('تعذر إكمال الدخول عبر Google. تحقق من الاتصال وحاول مرة أخرى.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rh-login-page">
      <div className="rh-login-card">
        <img className="rh-login-logo" src={branding.logoSrc} alt="" width={88} height={88} />
        <h1 className="rh-login-title">روضة الحافظين</h1>
        <p className="rh-login-sub">سجّل الدخول للمتابعة إلى المنصة</p>

        {suspendedNotice && (
          <div className="rh-login-error" role="status">
            تم تسجيل خروجك لأن الحساب أصبح غير نشط. إذا احتجت مساعدة فاتصل بالإدارة.
          </div>
        )}

        {error && (
          <div className="rh-login-error" role="alert">
            {error}
          </div>
        )}

        <Button type="button" variant="secondary" className="rh-google-btn" icon={Chrome} loading={busy} onClick={onGoogle}>
          المتابعة عبر Google
        </Button>

        <p className="rh-login-hint">بتسجيل الدخول أنت توافق على استخدام المنصة لأغراض تعليمية.</p>

        <Link className="rh-login-back" to="/">
          العودة للصفحة الرئيسية
        </Link>
      </div>
    </div>
  )
}
