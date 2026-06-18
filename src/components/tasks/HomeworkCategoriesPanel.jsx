import { Check, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/useAuth.js'
import { useSiteContent } from '../../context/useSiteContent.js'
import {
  findTodayHomeworkLog,
  homeworkCompletedLabel,
  saveHomeworkLog,
  subscribeHomeworkLogsForUser,
} from '../../services/homeworkLogService.js'
import { localYmd } from '../../utils/planDailyQuota.js'
import { Button, Modal, useToast } from '../../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../../ui/RhIcon.jsx'

export function HomeworkCategoriesPanel({ userId, readOnly = false }) {
  const { user } = useAuth()
  const { taskCategories, str } = useSiteContent()
  const toast = useToast()
  const [logs, setLogs] = useState([])
  const [pendingCategory, setPendingCategory] = useState(null)
  const [saving, setSaving] = useState(false)

  const todayYmd = useMemo(() => localYmd(), [])
  const categories = useMemo(
    () => [...(taskCategories || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [taskCategories],
  )

  useEffect(() => {
    if (!userId) {
      setLogs([])
      return undefined
    }
    return subscribeHomeworkLogsForUser(userId, setLogs, () => {
      toast.warning(str('tasks.homework_load_error'), str('tasks.homework_toast_title'))
    })
  }, [userId, str, toast])

  const handlePick = async (completed) => {
    if (!pendingCategory || !userId || readOnly) return
    setSaving(true)
    try {
      await saveHomeworkLog({
        ownerUid: userId,
        categoryId: pendingCategory.value,
        categoryLabel: pendingCategory.label,
        completed,
        ymd: todayYmd,
        userData: user || {},
      })
      toast.success(
        str('tasks.homework_saved', {
          label: pendingCategory.label,
          answer: homeworkCompletedLabel(completed),
        }),
        str('tasks.homework_toast_title'),
      )
      setPendingCategory(null)
    } catch {
      toast.warning(str('tasks.homework_save_error'), str('tasks.homework_toast_title'))
    } finally {
      setSaving(false)
    }
  }

  if (!categories.length) return null

  return (
    <section className="rh-homework-categories">
      <div className="rh-student-workspace__section-head" style={{ marginBottom: 'var(--rh-space-4)' }}>
        <div>
          <h2 className="rh-student-workspace__section-title">{str('tasks.homework_title')}</h2>
          <p className="rh-student-workspace__menu-desc">{str('tasks.homework_lead')}</p>
        </div>
        <span className="rh-task-chip">{str('tasks.homework_today', { date: todayYmd })}</span>
      </div>

      <div className="rh-homework-categories__grid">
        {categories.map((cat) => {
          const todayLog = findTodayHomeworkLog(logs, cat.value, todayYmd)
          const status =
            todayLog?.completed === true ? 'yes' : todayLog?.completed === false ? 'no' : 'pending'
          return (
            <button
              key={cat.id}
              type="button"
              className={[
                'rh-homework-categories__card',
                status === 'yes' ? 'rh-homework-categories__card--yes' : '',
                status === 'no' ? 'rh-homework-categories__card--no' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              disabled={readOnly || saving}
              onClick={() => !readOnly && setPendingCategory(cat)}
            >
              <span className="rh-homework-categories__label">{cat.label}</span>
              {cat.hint ? <span className="rh-homework-categories__hint">{cat.hint}</span> : null}
              <span className="rh-homework-categories__status">
                {status === 'yes'
                  ? str('tasks.homework_status_yes')
                  : status === 'no'
                    ? str('tasks.homework_status_no')
                    : str('tasks.homework_status_pending')}
              </span>
            </button>
          )
        })}
      </div>

      <Modal
        open={Boolean(pendingCategory)}
        title={str('tasks.homework_modal_title')}
        onClose={() => !saving && setPendingCategory(null)}
        size="sm"
        closeOnBackdrop={!saving}
        closeOnEsc={!saving}
        showClose={!saving}
      >
        <p className="rh-homework-categories__prompt">
          {str('tasks.homework_prompt', { label: pendingCategory?.label || '' })}
        </p>
        <div className="rh-homework-categories__actions">
          <Button
            type="button"
            variant="primary"
            icon={Check}
            loading={saving}
            onClick={() => handlePick(true)}
          >
            {str('tasks.homework_yes')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            icon={X}
            disabled={saving}
            onClick={() => handlePick(false)}
          >
            {str('tasks.homework_no')}
          </Button>
        </div>
      </Modal>
    </section>
  )
}
