import { useEffect, useState } from 'react'
import { fetchAll } from '../lib/fetchAll'
export function useContracts() {
  const [rows, setRows] = useState([])
  useEffect(() => { fetchAll('v_contracts').then(({ data }) => setRows(data || [])) }, [])
  return { rows }
}
