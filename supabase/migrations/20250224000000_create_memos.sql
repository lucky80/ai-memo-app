-- memos 테이블 (Memo 인터페이스와 1:1 매핑, snake_case)
-- id는 text로 해 시드 데이터('1','2' 등)와 신규(uuid 문자열) 모두 사용 가능
create table if not exists public.memos (
  id text primary key default (gen_random_uuid()::text),
  title text not null,
  content text not null,
  category text not null,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at 자동 갱신 (선택)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger memos_updated_at
  before update on public.memos
  for each row execute function public.set_updated_at();
