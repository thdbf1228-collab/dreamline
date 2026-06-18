// 관리자 전용: 담당자 비밀번호를 1111로 초기화 + 다음 로그인 시 변경 강제
// Supabase Edge Function. service_role 키는 함수 환경에 자동 주입되어 브라우저에 노출되지 않음.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // 1) 호출자가 admin인지 검증
    const authHeader = req.headers.get('Authorization') || ''
    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: u } = await caller.auth.getUser()
    if (!u?.user) return json({ error: '인증 필요' }, 401)
    const { data: prof } = await caller.from('profiles').select('role').eq('id', u.user.id).single()
    if (prof?.role !== 'admin') return json({ error: '관리자만 가능' }, 403)

    // 2) 대상 이메일의 비밀번호를 1111로
    const { email } = await req.json()
    if (!email) return json({ error: '이메일 필요' }, 400)
    const admin = createClient(url, serviceKey)
    const { data: list } = await admin.auth.admin.listUsers()
    const target = list.users.find((x) => x.email?.toLowerCase() === String(email).toLowerCase())
    if (!target) return json({ error: `계정 없음: ${email} (Supabase Add user로 먼저 생성)` }, 404)

    const { error: e1 } = await admin.auth.admin.updateUserById(target.id, { password: '1111' })
    if (e1) return json({ error: e1.message }, 500)
    await admin.from('profiles').update({ must_change_password: true }).eq('id', target.id)

    return json({ message: `${email} 비밀번호 1111로 초기화됨 (다음 로그인 시 변경 강제)` })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
