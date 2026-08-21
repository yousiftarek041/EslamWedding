-- ============================================
-- إعداد سجل التهاني (Guestbook) — Supabase
-- الصقي الكود ده كامل في: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================

create table if not exists public.wishes (
    id bigint generated always as identity primary key,
    name text not null check (char_length(name) between 1 and 60),
    message text not null check (char_length(message) between 1 and 500),
    created_at timestamptz not null default now()
);

-- تفعيل الحماية على مستوى الصفوف (ضروري جداً)
alter table public.wishes enable row level security;

-- السماح لأي حد (الزوار) بقراءة كل التهاني
create policy "wishes_public_read"
on public.wishes
for select
to anon
using (true);

-- السماح لأي حد (الزوار) بإضافة تهنئة جديدة فقط
-- (مفيش صلاحية تعديل أو حذف، فحد ميقدرش يمسح أو يغيّر تهنئة حد تاني)
create policy "wishes_public_insert"
on public.wishes
for insert
to anon
with check (true);

-- (اختياري) لو عايز التهاني تظهر لحظياً لكل الزوار المتواجدين على الصفحة
-- في نفس الوقت (Realtime)، فعّل الـ Replication لجدول wishes من:
-- Database → Replication → قسم supabase_realtime → فعّل جدول wishes
