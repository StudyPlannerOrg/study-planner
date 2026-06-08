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
  subject text not null,
  type text not null,
  due_date date not null,
  hours integer not null check (hours > 0),
  notes text not null,
  difficulty text not null check (difficulty in ('Baja', 'Media', 'Alta')),
  status text not null check (status in ('Pendiente', 'En progreso', 'Terminada')),
  created_at timestamptz not null default now()
);

create index if not exists idx_tasks_user_due_date on tasks (user_id, due_date);
