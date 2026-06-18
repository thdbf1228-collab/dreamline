-- ============================================================
-- 담당자 사진용 Storage 버킷 + 정책
-- Supabase SQL Editor에서 1회 실행 (schema_v2 이후)
-- ============================================================

-- 공개 버킷 생성
insert into storage.buckets (id, name, public)
values ('rep-photos', 'rep-photos', true)
on conflict (id) do update set public = true;

-- 읽기: 공개
drop policy if exists "rep photos public read" on storage.objects;
create policy "rep photos public read" on storage.objects
  for select using (bucket_id = 'rep-photos');

-- 업로드/수정/삭제: 관리자만
drop policy if exists "rep photos admin write" on storage.objects;
create policy "rep photos admin write" on storage.objects
  for all
  using (bucket_id = 'rep-photos' and public.is_admin())
  with check (bucket_id = 'rep-photos' and public.is_admin());
