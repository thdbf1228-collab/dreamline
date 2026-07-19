import { supabase } from './supabase'
// Supabase Max Rows(기본 1000) 우회: 1000행씩 끊어 전부 가져오기
export async function fetchAll(table) {
  const out = []
  const size = 1000
  for (let i = 0; i < 60; i++) {
    const from = i * size
    const { data, error } = await supabase.from(table).select('*').order('id').range(from, from + size - 1)
    if (error) return { data: out, error }
    if (!data || data.length === 0) break
    out.push(...data)
    if (data.length < size) break
  }
  return { data: out, error: null }
}
