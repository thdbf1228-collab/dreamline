# 드림라인 영업 파이프라인 대시보드

Vite + React + Tailwind + Supabase. 로그인 / 좌측 nav(전체·그룹별·거래처별·담당자별) / 관리자 업로드 / 담당자 관리.

## 0. 사전: Supabase SQL 실행 순서
1. `schema_v2.sql` — 테이블·뷰·RLS
2. `seed_reps.sql` — 그룹 3개 + 담당자 14명
3. `storage_policy.sql` — 사진용 `rep-photos` 공개 버킷

검증: `select label from public.pipeline_stages order by sort_order;` → 기회인지/제안/견적/계약/개통완료

## 1. 관리자 계정 만들기
Supabase 대시보드 → Authentication → Users → **Add user** (이메일·비밀번호, auto-confirm).
그다음 SQL Editor에서:
```sql
update public.profiles set role='admin' where email='너계정@dreamline.co.kr';
```
(가입하면 트리거가 profiles를 viewer로 자동 생성 → 위 쿼리로 admin 승격)

## 2. 배포 (Vercel)
1. 이 폴더를 GitHub 새 repo에 업로드 (`node_modules`는 빼고 — `.gitignore`에 이미 있음)
2. Vercel → New Project → 그 repo import (Framework: Vite 자동감지)
3. **Environment Variables** 두 개 등록 (Supabase → Settings → API에서 복사):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy

로컬 실행 시: `.env.example`을 `.env`로 복사해 같은 값 채우고 `npm install && npm run dev`.

## 3. 사용
- 로그인 → 좌측 nav로 이동. **설정·업로드**는 관리자에게만 보임.
- **설정·업로드**: 영업기회 / 계약 엑셀을 올리면 영업기회ID 기준으로 갱신(upsert).
  - 영업기회 → 계약 순으로 처리됨. 영업기회에 없는 계약은 자동 제외.
- **담당자 관리**: 그룹 배정 + 얼굴 사진 업로드.

## 동작 규칙 (참고)
- 표시 금액 = 계약 있으면 공급가액 합산(확정), 없으면 예상매출(추정) — `v_opportunities.display_amount`.
- 단계: 기회인지 → 제안 → 견적 → 계약 → 개통완료. 진행상태는 별도.
- 담당자 육각형은 담당자 전체 대비 상대값(min-max, 바닥 보정). 옆 숫자가 실제 절대값.
- 금액 단위는 원본 파일 기준 '천원' → 화면에선 만/억으로 환산 표기.
