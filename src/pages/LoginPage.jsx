import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { signInWithGoogle } from '../services/authService.js'
import { SITE_TITLE } from '../config/site.js'
import { Button } from '../ui/Button.jsx'

function GoogleIcon() {
  return (
    <svg className="rh-google-icon" viewBox="0 0 48 48" width={22} height={22} aria-hidden>
      <path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
      />
      <path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </svg>
  )
}

export default function LoginPage() {
  const { user, loading } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    document.title = `تسجيل الدخول — ${SITE_TITLE}`
  }, [])

  if (loading) {
    return (
      <div className="rh-auth-loading" role="status">
        <div className="rh-spinner" />
        <p>جاري التحميل…</p>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/app" replace />
  }

  const onGoogle = async () => {
    setBusy(true)
    setError('')
    try {
      await signInWithGoogle()
      navigate('/app', { replace: true })
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
        <img className="rh-login-logo" src="/logo.png" alt="" width={88} height={88} />
        <h1 className="rh-login-title">روضة الحافظين</h1>
        <p className="rh-login-sub">سجّل الدخول للمتابعة إلى المنصة</p>

        {error && (
          <div className="rh-login-error" role="alert">
            {error}
          </div>
        )}

        <Button type="button" variant="secondary" className="rh-google-btn" disabled={busy} onClick={onGoogle}>
          <GoogleIcon />
          {busy ? 'جاري الاتصال…' : 'المتابعة عبر Google'}
        </Button>

        <p className="rh-login-hint">بتسجيل الدخول أنت توافق على استخدام المنصة لأغراض تعليمية.</p>

        <Link className="rh-login-back" to="/">
          العودة للصفحة الرئيسية
        </Link>
      </div>
    </div>
  )
}
