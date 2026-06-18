import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useOpportunities() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)

  async function load() {
    setError(null)
    const { data, error } = await supabase
      .from('v_opportunities')
      .select('*')
      .limit(5000)
    if (error) setError(error.message)
    else setRows(data || [])
  }

  useEffect(() => {
    load()
  }, [])

  return { rows, error, reload: load, loading: rows === null && !error }
}
