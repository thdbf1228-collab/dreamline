import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anon) {
  // 빌드는 되지만 런타임에 바로 알아채도록 경고
  console.error('환경변수 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 없습니다.')
}

export const supabase = createClient(url, anon)
