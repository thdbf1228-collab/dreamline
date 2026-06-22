import { useMemo } from 'react'
import { useContracts } from '../data/useContracts'
import { Card } from '../components/ui'
import { won, num } from '../lib/format'
import { Loading } from './Overview'

const FROM = '2026-01-01'
const monthLabel = (k) => `${k.slice(0, 4)}년 ${Number(k.slice(5, 7))}월`

export default function Contracts() {
  const { rows } = useContracts()

  const months = useMemo(() => {
    const valid = rows.filter((c) => c.contract_date && c.contract_date >= FROM)
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
      .sort((a, b) => b.month.localeCompare(a.month)) // 최신 월 먼저
  }, [rows])

  if (rows === null) return <Loading />
  const totalCnt = months.reduce((s, m) => s + m.list.length, 0)

  return (
    <div className="space-y-6">
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
              <table className="w-full text-sm min-w-[520px]">
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
                      <td className="px-5 py-2.5 font-medium text-ink-800 whitespace-nowrap">{c.account_name || '-'}</td>
                      <td className="px-3 py-2.5 text-ink-600 max-w-[280px] truncate" title={c.title}>{c.title}</td>
                      <td className="px-3 py-2.5 text-ink-500 whitespace-nowrap">{c.rep_name || '-'}</td>
                      <td className="px-3 py-2.5 text-ink-400 tnum whitespace-nowrap">{(c.contract_date || '').replaceAll('-', '.')}</td>
                      <td className="px-5 py-2.5 text-right font-bold text-ink-900 tnum whitespace-nowrap">{won(c.supply_amount)}</td>
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
