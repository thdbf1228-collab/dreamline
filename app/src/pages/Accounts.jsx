import { useMemo, useState } from 'react'
import { useOpportunities } from '../data/useOpportunities'
import { byAccount } from '../data/aggregate'
import { Card } from '../components/ui'
import { won, num, pct } from '../lib/format'
import { Loading, ErrorBox } from './Overview'

const PAGE = 25

export default function Accounts() {
  const { rows, error, loading } = useOpportunities()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)

  const accounts = useMemo(() => (rows ? byAccount(rows) : []), [rows])
  const filtered = useMemo(() => {
    const s = q.trim()
    if (!s) return accounts
    return accounts.filter((a) => (a.name || '').includes(s) || (a.rep || '').includes(s))
  }, [accounts, q])

  if (loading) return <Loading />
  if (error) return <ErrorBox msg={error} />

  const pages = Math.ceil(filtered.length / PAGE)
  const slice = filtered.slice(page * PAGE, page * PAGE + PAGE)

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink-900">거래처별</h1>
          <p className="text-sm text-ink-500">{num(filtered.length)}개 거래처</p>
        </div>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(0)
          }}
          placeholder="거래처 · 담당자 검색"
          className="w-64 rounded-lg border border-line px-3 py-2 text-sm focus:border-brand"
        />
      </header>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-400 border-b border-line">
              <th className="px-4 py-2.5 font-medium">거래처</th>
              <th className="px-4 py-2.5 font-medium">담당자</th>
              <th className="px-4 py-2.5 font-medium">그룹</th>
              <th className="px-4 py-2.5 font-medium text-right">건수</th>
              <th className="px-4 py-2.5 font-medium text-right">파이프라인</th>
              <th className="px-4 py-2.5 font-medium text-right">확정매출</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {slice.map((a) => (
              <tr key={a.name} className="hover:bg-canvas">
                <td className="px-4 py-2.5 text-ink-900 font-medium">{a.name}</td>
                <td className="px-4 py-2.5 text-ink-500">{a.rep || '-'}</td>
                <td className="px-4 py-2.5 text-ink-500">{a.group || '-'}</td>
                <td className="px-4 py-2.5 text-right text-ink-700 tnum">{a.count}</td>
                <td className="px-4 py-2.5 text-right text-ink-700 tnum">{won(a.pipelineAmount)}</td>
                <td className="px-4 py-2.5 text-right text-ink-700 tnum">{won(a.confirmedAmount)}</td>
              </tr>
            ))}
            {slice.length === 0 && (
              <tr>
                <td colSpan="6" className="px-4 py-10 text-center text-ink-400">
                  검색 결과가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40"
          >
            이전
          </button>
          <span className="text-ink-500">
            {page + 1} / {pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
            disabled={page >= pages - 1}
            className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40"
          >
            다음
          </button>
        </div>
      )}
    </div>
  )
}
