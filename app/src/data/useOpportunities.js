import { useEffect, useState } from 'react'
import { fetchAll } from '../lib/fetchAll'

export function useOpportunities() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  async function load() {
    setError(null)
    const { data, error } = await fetchAll('v_opportunities')
    if (error) setError(error.message)
    else setRows(data || [])
  }
  useEffect(() => { load() }, [])
  return { rows, error, reload: load, loading: rows === null && !error }
}
