const pad = (n: number) => String(n).padStart(2, '0')

export function formatDateTime(d: Date | number | string): string {
  const dt = typeof d === 'string' ? new Date(d) : typeof d === 'number' ? new Date(d) : d
  if (isNaN(dt.getTime())) return ''
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`
}
