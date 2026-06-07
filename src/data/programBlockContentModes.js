/** أنماط عرض محتوى بلوك صفحة البداية */
export const PROGRAM_BLOCK_CONTENT_MODES = [
  {
    value: 'lead',
    label: 'نص سردي بارز',
    hint: 'فقرة واحدة بخط أوضح (مثل التعريف بالبرنامج).',
  },
  {
    value: 'paragraphs',
    label: 'فقرات متعددة',
    hint: 'اكتب كل فقرة في سطر مستقل.',
  },
  {
    value: 'list',
    label: 'قائمة نقاط',
    hint: 'اكتب كل بند في سطر مستقل.',
  },
  {
    value: 'message',
    label: 'رسالة مميّزة',
    hint: 'نص قصير بأسلوب رسالة أو شعار (مثل رسالة البرنامج).',
  },
]

export function programBlockContentModeLabel(value) {
  return PROGRAM_BLOCK_CONTENT_MODES.find((m) => m.value === value)?.label || value
}

export function programBlockContentModeHint(value) {
  return PROGRAM_BLOCK_CONTENT_MODES.find((m) => m.value === value)?.hint || ''
}
