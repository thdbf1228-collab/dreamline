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

## v2 업데이트 적용 (이번 변경)
1. **`update_view_60d.sql` 실행** — 정체 기준 14→60일.
2. **`seed_reps.sql` 다시 실행** — 1·2·3그룹 + 담당자 그룹배정 (설정 드랍다운/그룹별 정상화).
3. **비밀번호 재설정 메일** 쓰려면:
   - Authentication → **SMTP Settings**에 커스텀 SMTP 등록 (사내 메일 서버 또는 Resend/SendGrid 등). 기본 발송은 시간당 2통 + 팀원 외 주소 거부라 운영 불가.
   - Authentication → **URL Configuration → Redirect URLs**에 배포 주소(예: `https://your-app.vercel.app`) 추가. 안 하면 재설정 링크가 되돌아오지 못함.
4. 담당자 관리에서 각 담당자 **이메일** 입력 (재설정 메일 발송 대상).

## 변경 요약
- 전체현황: 기업/글로벌 토글, '전체 건수' KPI, 진행상태 분포 바, 정체 60일.
- 거래처별: 단계별 파이프라인 보드 + 필터(매출구분/그룹/담당자/상태/검색), 242건 전부.
- 담당자별: 육각형 꼭짓점 라벨, 좌우 하단 정렬, 큰 파이프라인, 기업/글로벌 토글.
- 로그인: 비밀번호 찾기(재설정 메일) + 새 비번 설정 화면.
