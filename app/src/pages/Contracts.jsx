import { useMemo } from 'react'
import { useContracts } from '../data/useContracts'
import { Card } from '../components/ui'
import { won, num } from '../lib/format'
import { Loading } from './Overview'

const FROM = '2026-01-01'
const monthLabel = (k) => `${k.slice(0, 4)}년 ${Number(k.slice(5, 7))}월`

export default function Contracts() {
  const { rows } = useContracts()

  const valid = useMemo(() => rows.filter((c) => c.contract_date && c.contract_date >= FROM), [rows])
  // 거래처 열 고정폭 = 가장 긴 거래처명 기준(한글 1em, 6~16em 캡)
  const accEm = useMemo(() => {
    const maxLen = Math.max(6, ...valid.map((c) => (c.account_name || '').length))
    return Math.min(16, maxLen) + 1
  }, [valid])

  const months = useMemo(() => {
    const m = new Map()
    for (const c of valid) {
      const k = c.contract_date.slice(0, 7)
      if (!m.has(k)) m.set(k, [])
      m.get(k).push(c)
    }
    return [...m.entries()]
      .map(([month, list]) => ({
        month,
        list: list.sort((a, b) => (Number(b.supply_amount) || 0) - (Number(a.supply_amount) || 0)),
        sum: list.reduce((s, c) => s + (Number(c.supply_amount) || 0), 0),
      }))
      .sort((a, b) => b.month.localeCompare(a.month))
  }, [valid])

  if (rows === null) return <Loading />
  const totalCnt = valid.length

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-ink-900">계약</h1>
        <p className="text-sm text-ink-500">계약일 {FROM.replaceAll('-', '.')} 이후 · {num(totalCnt)}건 · 월별 · 금액순</p>
      </header>

      {months.length === 0 ? (
        <p className="py-16 text-center text-sm text-ink-400">계약 데이터가 없습니다. (계약 파일 업로드 필요)</p>
      ) : (
        months.map((m) => (
          <Card key={m.month} className="overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-line bg-canvas">
              <span className="text-base font-bold text-ink-900">{monthLabel(m.month)}</span>
              <span className="text-sm text-ink-500">{m.list.length}건 · <b className="text-brand tnum">{won(m.sum)}</b></span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed min-w-[600px]">
                <colgroup>
                  <col style={{ width: `${accEm}em` }} />
                  <col />
                  <col style={{ width: '5.5em' }} />
                  <col style={{ width: '6.5em' }} />
                  <col style={{ width: '8em' }} />
                </colgroup>
                <thead>
                  <tr className="text-left text-xs text-ink-400">
                    <th className="px-5 py-2 font-medium">거래처</th>
                    <th className="px-3 py-2 font-medium">계약명</th>
                    <th className="px-3 py-2 font-medium">담당자</th>
                    <th className="px-3 py-2 font-medium">계약일</th>
                    <th className="px-5 py-2 font-medium text-right">금액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {m.list.map((c) => (
                    <tr key={c.id} className="hover:bg-canvas">
                      <td className="px-5 py-2.5 font-medium text-ink-800 truncate" title={c.account_name}>{c.account_name || '-'}</td>
                      <td className="px-3 py-2.5 text-ink-600 truncate" title={c.title}>{c.title}</td>
                      <td className="px-3 py-2.5 text-ink-500 truncate">{c.rep_name || '-'}</td>
                      <td className="px-3 py-2.5 text-ink-400 tnum">{(c.contract_date || '').replaceAll('-', '.')}</td>
                      <td className="px-5 py-2.5 text-right font-bold text-ink-900 tnum">{won(c.supply_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))
      )}
    </div>
  )
}
