import { REMOTE_TASMEE_MEDIA, REMOTE_TASMEE_PROVIDER } from './remoteTasmeeStorage.js'

function randomRoomSlug() {
  return `rh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * رابط غرفة جيتسي جاهزة (يمكن ملء الحقل برمجياً).
 * @param {{ audioOnly?: boolean }} opts
 */
export function buildJitsiMeetUrl(opts = {}) {
  const { audioOnly = false } = opts
  const room = encodeURIComponent(randomRoomSlug())
  const base = `https://meet.jit.si/${room}`
  return audioOnly ? `${base}#config.startAudioOnly=true` : base
}

/** روابط بدء اجتماع في المتصفح (تبويب جديد). المستخدم ينسخ الرابط يدوياً بعد الإنشاء. */
export const MEETING_PROVIDER_START_URL = {
  [REMOTE_TASMEE_PROVIDER.GOOGLE_MEET]: 'https://meet.new',
  [REMOTE_TASMEE_PROVIDER.ZOOM]: 'https://zoom.us/start/videomeeting',
  [REMOTE_TASMEE_PROVIDER.TEAMS]: 'https://teams.microsoft.com/l/meetup-join/new',
  [REMOTE_TASMEE_PROVIDER.DISCORD]: 'https://discord.com/app',
  [REMOTE_TASMEE_PROVIDER.WEBEX]: 'https://signin.webex.com/join',
}

/**
 * @param {string} providerId
 * @param {{ setMeetingUrl: (s: string) => void, setProvider: (s: string) => void, mediaType?: string, openWindow?: boolean }} ctx
 * @returns {Promise<'filled' | 'opened'>}
 */
export async function runMeetingProviderLaunch(providerId, ctx) {
  const { setMeetingUrl, setProvider, mediaType, openWindow = true } = ctx
  setProvider(providerId)

  if (providerId === REMOTE_TASMEE_PROVIDER.JITSI) {
    const audioOnly = mediaType === REMOTE_TASMEE_MEDIA.AUDIO
    const url = buildJitsiMeetUrl({ audioOnly })
    setMeetingUrl(url)
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      /* قد تفشل بدون HTTPS أو إذن */
    }
    if (openWindow) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
    return 'filled'
  }

  const startUrl = MEETING_PROVIDER_START_URL[providerId]
  if (startUrl && openWindow) {
    window.open(startUrl, '_blank', 'noopener,noreferrer')
  }
  return 'opened'
}
