create table if not exists users (
  id text primary key,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  title text not null,
  subject text,
  type text not null,
  due_date date not null,
  due_time text,
  hours integer check (hours is null or hours > 0),
  notes text,
  checklist jsonb not null default '[]'::jsonb,
  difficulty text not null check (difficulty in ('Baja', 'Media', 'Alta')),
  status text not null check (status in ('Pendiente', 'En progreso', 'Terminada')),
  created_at timestamptz not null default now()
);

alter table tasks alter column subject drop not null;
alter table tasks alter column hours drop not null;
alter table tasks alter column notes drop not null;
alter table tasks add column if not exists checklist jsonb not null default '[]'::jsonb;
alter table tasks add column if not exists due_time text;
update tasks set checklist = '[]'::jsonb where checklist is null;

create index if not exists idx_tasks_user_due_date on tasks (user_id, due_date);
