import { useEffect } from 'react'
import { SITE_TITLE } from '../config/site.js'
import { useAuth } from '../context/useAuth.js'

export default function SettingsPage() {
  const { user } = useAuth()

  useEffect(() => {
    document.title = `الإعدادات — ${SITE_TITLE}`
  }, [])

  return (
    <div className="rh-settings">
      <section className="card">
        <h2>الإعدادات</h2>
        <p className="lead">هذه الصفحة مخصصة لخيارات الحساب والمنصة — سيتم إكمالها لاحقاً.</p>
        <ul className="rh-settings-list">
          <li>
            <strong>الاسم:</strong> {user?.displayName || '—'}
          </li>
          <li>
            <strong>البريد:</strong> {user?.email || '—'}
          </li>
        </ul>
      </section>
    </div>
  )
}
