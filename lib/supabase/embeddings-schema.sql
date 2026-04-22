-- Meeting embeddings for semantic search
create table if not exists meeting_embeddings (
  id uuid primary key default gen_random_uuid(),
  meeting_id text references meetings(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  chunk_index integer not null,
  chunk_text text not null,
  chunk_type text not null default 'transcript', -- transcript | summary | intake
  embedding vector(1536) not null,
  token_count integer,
  created_at timestamptz not null default now()
);

create index if not exists meeting_embeddings_meeting_idx on meeting_embeddings(meeting_id);
create index if not exists meeting_embeddings_user_idx on meeting_embeddings(user_id);
create index if not exists meeting_embeddings_vector_idx on meeting_embeddings
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table meeting_embeddings enable row level security;
create policy "embeddings_owner_select" on meeting_embeddings for select using (auth.uid() = user_id);
create policy "embeddings_owner_insert" on meeting_embeddings for insert with check (auth.uid() = user_id);
create policy "embeddings_owner_delete" on meeting_embeddings for delete using (auth.uid() = user_id);

-- RPC function for semantic search with cosine similarity
create or replace function match_meeting_embeddings(
  query_embedding vector(1536),
  match_threshold float default 0.5,
  match_count int default 10,
  p_user_id uuid default null
)
returns table (
  meeting_id text,
  chunk_text text,
  chunk_type text,
  similarity float,
  meeting_title text,
  meeting_date timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
    select
      me.meeting_id,
      me.chunk_text,
      me.chunk_type,
      1 - (me.embedding <=> query_embedding) as similarity,
      m.title as meeting_title,
      m.created_at as meeting_date
    from public.meeting_embeddings me
    join public.meetings m on m.id = me.meeting_id
    where me.user_id = p_user_id
      and 1 - (me.embedding <=> query_embedding) > match_threshold
    order by me.embedding <=> query_embedding
    limit match_count;
end;
$$;

-- Add api_key to profiles for MCP auth
alter table profiles add column if not exists api_key text unique;
