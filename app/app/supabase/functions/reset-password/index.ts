// 관리자 전용 계정 관리 함수
// 기본: 계정 생성 또는 비번 111111 초기화 / action=disable|enable|delete
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const authHeader = req.headers.get('Authorization') || ''
    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: u } = await caller.auth.getUser()
    if (!u?.user) return json({ error: '인증 필요' }, 401)
    const { data: prof } = await caller.from('profiles').select('role').eq('id', u.user.id).single()
    if (prof?.role !== 'admin') return json({ error: '관리자만 가능' }, 403)

    const { email, action } = await req.json()
    if (!email) return json({ error: '이메일 필요' }, 400)
    const e = String(email).trim().toLowerCase()
    const admin = createClient(url, serviceKey)
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const target = list.users.find((x) => x.email?.toLowerCase() === e)

    if (action === 'disable') {
      if (!target) return json({ message: `${e} 로그인 계정 없음 (차단 불필요)` })
      const { error: er } = await admin.auth.admin.updateUserById(target.id, { ban_duration: '876000h' })
      if (er) return json({ error: er.message }, 500)
      return json({ message: `${e} 로그인 차단됨` })
    }
    if (action === 'enable') {
      if (!target) return json({ message: `${e} 로그인 계정 없음` })
      const { error: er } = await admin.auth.admin.updateUserById(target.id, { ban_duration: 'none' })
      if (er) return json({ error: er.message }, 500)
      return json({ message: `${e} 로그인 차단 해제됨` })
    }
    if (action === 'delete') {
      if (!target) return json({ message: `${e} 로그인 계정 없음` })
      const { error: er } = await admin.auth.admin.deleteUser(target.id)
      if (er) return json({ error: er.message }, 500)
      return json({ message: `${e} 로그인 계정 삭제됨` })
    }

    // 기본: 계정 생성 또는 비번 111111 초기화
    let userId, msg
    if (target) {
      const { error: er } = await admin.auth.admin.updateUserById(target.id, { password: '111111' })
      if (er) return json({ error: er.message }, 500)
      userId = target.id; msg = `${e} 비밀번호 111111로 초기화됨`
    } else {
      const { data: created, error: er } = await admin.auth.admin.createUser({ email: e, password: '111111', email_confirm: true })
      if (er) return json({ error: er.message }, 500)
      userId = created.user.id; msg = `${e} 로그인 계정 생성됨 (비번 111111)`
    }
    await admin.from('profiles').update({ must_change_password: true }).eq('id', userId)
    return json({ message: msg })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
