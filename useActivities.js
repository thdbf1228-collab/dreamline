import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
export function useNotice() {
  const [notice, setNotice] = useState('')
  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'notice').maybeSingle()
      .then(({ data }) => setNotice(data?.value || ''))
  }, [])
  return notice
}
