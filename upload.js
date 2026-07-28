import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { buildModel } from './revenueModel'

// 매출현황 데이터 훅: revenue_data(단일행) 로드 → 모델 계산.
export function useRevenue() {
  const [state, setState] = useState({ loading: true, error: null, model: null, pipes: null, updatedAt: null })
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('revenue_data').select('plan,pipes,ebit,updated_at').eq('id', 1).maybeSingle()
      if (error) { setState({ loading: false, error: error.message, model: null, pipes: null, updatedAt: null }); return }
      if (!data || !data.plan) { setState({ loading: false, error: null, model: null, pipes: null, updatedAt: null }); return }
      try {
        const model = buildModel(data.plan, data.pipes || {}, data.ebit || null)
        setState({ loading: false, error: null, model, pipes: data.pipes || {}, updatedAt: data.updated_at })
      } catch (e) {
        setState({ loading: false, error: '계산 오류: ' + e.message, model: null, pipes: null, updatedAt: null })
      }
    })()
  }, [])
  return state
}
