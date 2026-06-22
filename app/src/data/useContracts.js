import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
export function useContracts() {
  const [rows, setRows] = useState([])
  useEffect(() => {
    supabase.from('v_contracts').select('*').limit(20000).then(({ data }) => setRows(data || []))
  }, [])
  return { rows }
}
