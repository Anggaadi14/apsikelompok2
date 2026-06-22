-- ============================================================================
-- Restore email-verification bookkeeping on app_user.
--
-- Why: the team already has a working custom-branded verification email
-- flow (app/lib/email.ts + nodemailer) that the rest of the frontend
-- (app/verify/page.tsx, app/signup/page.tsx) is built around. Rather than
-- replace that UX with Supabase's own confirmation-link redirect dance,
-- Supabase Auth is used purely for credential storage + session cookies
-- (auth.users, signInWithPassword) while `app_user` keeps its own
-- pending_verification gate + token, exactly like the old `user` table did.
-- ============================================================================

alter type app_user_status add value 'pending_verification';

alter table app_user
  add column token_verifikasi varchar(255) null,
  add column token_expires_at timestamptz null,
  add column verified_at timestamptz null;

create index idx_app_user_token on app_user (token_verifikasi);

alter table app_user alter column status set default 'pending_verification';
