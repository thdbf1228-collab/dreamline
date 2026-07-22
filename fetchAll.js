import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export const HIDDEN_GROUP = '관리자' // 명단/집계에서 제외할 그룹
// 앞뒤 공백/표기 흔들림에도 걸리도록 정규화 비교
export const isHiddenGroup = (g) => (g || '').trim() === HIDDEN_GROUP

// 담당자관리(reps) 명단 — 그룹명/제외여부 포함. 0건 담당자 표기용.
export function useReps() {
  const [reps, setReps] = useState([])
  useEffect(() => {
    (async () => {
      const [{ data: r }, { data: g }] = await Promise.all([
        supabase.from('reps').select('id,name,group_id,excluded'),
        supabase.from('groups').select('id,name'),
      ])
      const gmap = new Map((g || []).map((x) => [x.id, x.name]))
      setReps((r || []).map((x) => ({
        rep_name: x.name,
        group_name: x.group_id ? gmap.get(x.group_id) : null,
        excluded: !!x.excluded,
      })).filter((x) => !isHiddenGroup(x.group_name) && !x.excluded))
    })()
  }, [])
  return { reps }
}
