// 비밀번호 찾기(공개) — 허용된 관리자 이메일에 한해
// 임시 비밀번호 생성 → 기존 비번 무효화(service_role) → Gmail SMTP로 발송
// Secrets 필요: GMAIL_USER, GMAIL_APP_PASSWORD  (선택: ALLOWED_RESET_EMAILS, MAIL_TO)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function tempPassword(len = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const a = new Uint8Array(len); crypto.getRandomValues(a)
  return Array.from(a, (n) => chars[n % chars.length]).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const gmailUser = Deno.env.get('GMAIL_USER')!
    const gmailPass = Deno.env.get('GMAIL_APP_PASSWORD')!
    // 허용 이메일(화이트리스트) — 아무 주소나 비번 초기화 못 하게
    const allowed = (Deno.env.get('ALLOWED_RESET_EMAILS') || 'jiyoung76@dreamline.co.kr')
      .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    // 받는주소 고정(미설정 시 요청 이메일로)
    const fixedTo = Deno.env.get('MAIL_TO') || ''

    const body = await req.json().catch(() => ({}))
    const e = String(body.email || '').trim().toLowerCase()
    if (!e) return json({ error: '이메일이 필요합니다.' }, 400)
    if (!allowed.includes(e)) return json({ error: '허용되지 않은 계정입니다.' }, 403)

    const admin = createClient(url, serviceKey)
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const target = list.users.find((x) => x.email?.toLowerCase() === e)
    if (!target) return json({ error: '해당 계정을 찾을 수 없습니다.' }, 404)

    // 임시 비번 생성 + 기존 즉시 무효화
    const temp = tempPassword(10)
    const { error: upErr } = await admin.auth.admin.updateUserById(target.id, { password: temp })
    if (upErr) return json({ error: '비밀번호 변경 실패: ' + upErr.message }, 500)
    await admin.from('profiles').update({ must_change_password: true }).eq('id', target.id)

    // Gmail SMTP 발송
    const to = fixedTo || target.email!
    const client = new SMTPClient({
      connection: { hostname: 'smtp.gmail.com', port: 465, tls: true, auth: { username: gmailUser, password: gmailPass } },
    })
    await client.send({
      from: `DREAMLINE <${gmailUser}>`,
      to,
      subject: 'DREAMLINE - Temporary Password',
      content: `[DREAMLINE] 임시 비밀번호 안내\n\n임시 비밀번호: ${temp}\n\n로그인 후 즉시 새 비밀번호로 변경하세요.\n기존 비밀번호는 무효화되었습니다.`,
      html: `<div style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#222">
        <p>[DREAMLINE] 임시 비밀번호 안내</p>
        <p>임시 비밀번호: <b style="font-size:20px;letter-spacing:1px">${temp}</b></p>
        <p>로그인 후 즉시 새 비밀번호로 변경하세요. 기존 비밀번호는 무효화되었습니다.</p>
      </div>`,
    })
    await client.close()

    return json({ message: `임시 비밀번호를 ${to} 로 발송했습니다.` })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
