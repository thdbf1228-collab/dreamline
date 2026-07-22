import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// 관리자가 등록한 주간현황 제외일(휴무일) — app_settings key='holidays'에 JSON 배열
export function useHolidays() {
  const [days, setDays] = useState([])
  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'holidays').maybeSingle()
      .then(({ data }) => { try { setDays(JSON.parse(data?.value || '[]')) } catch { setDays([]) } })
  }, [])
  return days
}
