import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useActivities() {
  const [rows, setRows] = useState([])
  useEffect(() => {
    supabase.from('v_activities').select('*').limit(20000).then(({ data }) => setRows(data || []))
  }, [])
  return { rows }
}
