create table if not exists rekomendasi_mutu (
  id_rekomendasi bigserial primary key,
  kode_rekomendasi varchar(30) not null unique,
  id_cpl int null references cpl(id_cpl) on delete set null,
  cpl_label varchar(255) not null,
  rekomendasi text not null,
  target_role varchar(20) not null check (target_role in ('dosen','kaprodi')),
  status varchar(20) not null default 'Draft' check (status in ('Draft','Sent','Resolved')),
  tanggal date not null default current_date,
  dibuat_oleh_user int null references app_user(id_user) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_rekomendasi_mutu_updated_at on rekomendasi_mutu;
create trigger trg_rekomendasi_mutu_updated_at before update on rekomendasi_mutu
  for each row execute function set_updated_at();

create index if not exists idx_rekomendasi_mutu_status on rekomendasi_mutu(status);
create index if not exists idx_rekomendasi_mutu_cpl on rekomendasi_mutu(id_cpl);

create table if not exists usulan_wording (
  id_usulan bigserial primary key,
  kode_usulan varchar(30) not null unique,
  tipe varchar(10) not null check (tipe in ('CPL','IK','CPMK')),
  kode varchar(50) not null,
  current_wording text null,
  proposed_wording text not null,
  bloom_level varchar(50) not null,
  status varchar(20) not null default 'Pending' check (status in ('Pending','Approved','Rejected')),
  notes text null,
  dibuat_oleh_user int null references app_user(id_user) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_usulan_wording_updated_at on usulan_wording;
create trigger trg_usulan_wording_updated_at before update on usulan_wording
  for each row execute function set_updated_at();

create index if not exists idx_usulan_wording_status on usulan_wording(status);
create index if not exists idx_usulan_wording_tipe on usulan_wording(tipe);

alter table rekomendasi_mutu enable row level security;
alter table usulan_wording enable row level security;
