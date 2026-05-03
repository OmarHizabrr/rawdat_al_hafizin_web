import {
  Briefcase,
  Cast,
  Gamepad2,
  Link2,
  MonitorPlay,
  UsersRound,
  Zap,
} from 'lucide-react'
import { REMOTE_TASMEE_PROVIDER, normalizeRemoteTasmeeProvider } from './remoteTasmeeStorage.js'

/** أيقونة Lucide مميزة لكل تطبيق اجتماع (ليست شعارات العلامات التجارية). */
const PROVIDER_ICONS = {
  [REMOTE_TASMEE_PROVIDER.GOOGLE_MEET]: MonitorPlay,
  [REMOTE_TASMEE_PROVIDER.ZOOM]: Zap,
  [REMOTE_TASMEE_PROVIDER.TEAMS]: UsersRound,
  [REMOTE_TASMEE_PROVIDER.JITSI]: Cast,
  [REMOTE_TASMEE_PROVIDER.DISCORD]: Gamepad2,
  [REMOTE_TASMEE_PROVIDER.WEBEX]: Briefcase,
  [REMOTE_TASMEE_PROVIDER.OTHER]: Link2,
}

/** لاحقة ألوان الشارات والأزرار (تطابق أصناف CSS الحالية حيث ينطبق). */
const BRAND_SUFFIX = {
  [REMOTE_TASMEE_PROVIDER.GOOGLE_MEET]: 'google',
  [REMOTE_TASMEE_PROVIDER.ZOOM]: 'zoom',
  [REMOTE_TASMEE_PROVIDER.TEAMS]: 'teams',
  [REMOTE_TASMEE_PROVIDER.JITSI]: 'jitsi',
  [REMOTE_TASMEE_PROVIDER.DISCORD]: 'discord',
  [REMOTE_TASMEE_PROVIDER.WEBEX]: 'webex',
  [REMOTE_TASMEE_PROVIDER.OTHER]: 'other',
}

export function remoteTasmeeProviderLucideIcon(providerKey) {
  const k = normalizeRemoteTasmeeProvider(providerKey)
  return PROVIDER_ICONS[k] || Link2
}

export function remoteTasmeeProviderBrandSuffix(providerKey) {
  const k = normalizeRemoteTasmeeProvider(providerKey)
  return BRAND_SUFFIX[k] || 'other'
}
