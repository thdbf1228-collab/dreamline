// 금액 단위는 원본 파일 기준 '천원'. 표시는 백만/억 단위로 환산.
// 예: 270000(천원) = 2.7억원

export function parseNum(v) {
  if (v === null || v === undefined) return 0
  if (typeof v === 'number') return isFinite(v) ? v : 0
  const s = String(v).trim().replace(/,/g, '')
  if (s === '' || s.toLowerCase() === 'null') return 0
  const n = Number(s)
  return isFinite(n) ? n : 0
}

export function parseInt0(v) {
  const n = parseNum(v)
  return Math.round(n)
}

// "2026.06.16", "2026-06-16", Excel serial -> "YYYY-MM-DD" | null
export function parseDate(v) {
  if (v === null || v === undefined) return null
  if (typeof v === 'number' && v > 20000) {
    // Excel serial date
    const d = new Date(Math.round((v - 25569) * 86400 * 1000))
    return d.toISOString().slice(0, 10)
  }
  const s = String(v).trim()
  if (!s || s.toLowerCase() === 'null') return null
  const m = s.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/)
  if (!m) return null
  const [, y, mo, da] = m
  return `${y}-${mo.padStart(2, '0')}-${da.padStart(2, '0')}`
}

// 천원 단위 금액 -> 사람이 읽는 한글 표기
export function won(amountInThousand) {
  const n = Number(amountInThousand) || 0
  const m = n / 1000 // 천원 → 백만원
  return m.toLocaleString('ko-KR', { maximumFractionDigits: 2 }) + '백만'
}

export function num(n) {
  return (Number(n) || 0).toLocaleString()
}

export function pct(n, digits = 0) {
  return (Number(n) || 0).toFixed(digits) + '%'
}
