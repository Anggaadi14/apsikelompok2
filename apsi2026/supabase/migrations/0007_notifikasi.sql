-- 0007_notifikasi.sql
-- In-app notification untuk dosen, dipakai pertama kali untuk notifikasi
-- ko-pengampu (team teaching) saat ada upload nilai di kelas yang sama.

create table if not exists notifikasi (
  id_notifikasi  bigserial primary key,
  id_staff       int not null references staff(id_staff) on delete cascade,
  judul          varchar(150) not null,
  pesan          text not null,
  jenis          varchar(30) not null check (jenis in ('upload_nilai','edit_nilai')),
  id_kelas       int null references kelas_mk(id_kelas) on delete set null,
  is_read        boolean not null default false,
  created_at     timestamptz not null default now()
);

create index if not exists idx_notifikasi_staff_unread on notifikasi (id_staff, is_read);
create index if not exists idx_notifikasi_kelas on notifikasi (id_kelas);

alter table notifikasi enable row level security;
