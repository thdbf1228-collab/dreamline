import { useEffect, useState } from 'react'
import { fetchAll } from '../lib/fetchAll'
export function useActivities() {
  const [rows, setRows] = useState([])
  useEffect(() => { fetchAll('v_activities').then(({ data }) => setRows(data || [])) }, [])
  return { rows }
}
