-- =====================================================================
-- Meeting embeddings for semantic + hybrid search
-- Best practices as of April 2026:
--   - HNSW index (not IVFFlat) — better recall, handles inserts, no rebuild
--   - Full-text search column for hybrid BM25 + vector search
--   - Reciprocal Rank Fusion combines both result sets
-- =====================================================================

-- Enable pgvector if not already
create extension if not exists vector;

create table if not exists meeting_embeddings (
  id uuid primary key default gen_random_uuid(),
  meeting_id text references meetings(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  chunk_index integer not null,
  chunk_text text not null,
  chunk_type text not null default 'transcript', -- transcript | summary | intake
  embedding vector(1536) not null,
  token_count integer,
  -- Full-text search vector for hybrid BM25 search
  fts tsvector generated always as (to_tsvector('english', chunk_text)) stored,
  created_at timestamptz not null default now()
);

-- B-tree indexes for filtering
create index if not exists meeting_embeddings_meeting_idx
  on meeting_embeddings(meeting_id);
create index if not exists meeting_embeddings_user_idx
  on meeting_embeddings(user_id);

-- HNSW index for vector similarity (best practice 2026)
-- HNSW: O(log n) query, handles inserts without rebuild, better recall
-- IVFFlat: faster build but slower query, needs rebuild after inserts
create index if not exists meeting_embeddings_vector_idx
  on meeting_embeddings using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- GIN index for full-text search (BM25)
create index if not exists meeting_embeddings_fts_idx
  on meeting_embeddings using gin (fts);

-- RLS
alter table meeting_embeddings enable row level security;

drop policy if exists "embeddings_owner_select" on meeting_embeddings;
create policy "embeddings_owner_select"
  on meeting_embeddings for select using (auth.uid() = user_id);

drop policy if exists "embeddings_owner_insert" on meeting_embeddings;
create policy "embeddings_owner_insert"
  on meeting_embeddings for insert with check (auth.uid() = user_id);

drop policy if exists "embeddings_owner_delete" on meeting_embeddings;
create policy "embeddings_owner_delete"
  on meeting_embeddings for delete using (auth.uid() = user_id);

-- =====================================================================
-- Hybrid search function: combines vector similarity + BM25 full-text
-- Uses Reciprocal Rank Fusion (RRF) to merge rankings
-- =====================================================================
create or replace function hybrid_search_meetings(
  query_text text,
  query_embedding vector(1536),
  match_count int default 10,
  p_user_id uuid default null,
  -- Weight for vector vs text (0.0 = pure text, 1.0 = pure vector)
  vector_weight float default 0.7
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
declare
  k constant int := 60; -- RRF constant
begin
  return query
  with vector_results as (
    select
      me.meeting_id,
      me.chunk_text,
      me.chunk_type,
      me.id as chunk_id,
      1 - (me.embedding <=> query_embedding) as vec_similarity,
      row_number() over (order by me.embedding <=> query_embedding) as vec_rank
    from public.meeting_embeddings me
    where me.user_id = p_user_id
    order by me.embedding <=> query_embedding
    limit match_count * 3
  ),
  text_results as (
    select
      me.meeting_id,
      me.chunk_text,
      me.chunk_type,
      me.id as chunk_id,
      ts_rank(me.fts, websearch_to_tsquery('english', query_text)) as text_score,
      row_number() over (
        order by ts_rank(me.fts, websearch_to_tsquery('english', query_text)) desc
      ) as text_rank
    from public.meeting_embeddings me
    where me.user_id = p_user_id
      and me.fts @@ websearch_to_tsquery('english', query_text)
    limit match_count * 3
  ),
  combined as (
    select
      coalesce(v.meeting_id, t.meeting_id) as meeting_id,
      coalesce(v.chunk_text, t.chunk_text) as chunk_text,
      coalesce(v.chunk_type, t.chunk_type) as chunk_type,
      coalesce(v.chunk_id, t.chunk_id) as chunk_id,
      -- Reciprocal Rank Fusion score
      (vector_weight * coalesce(1.0 / (k + v.vec_rank), 0.0))
      + ((1.0 - vector_weight) * coalesce(1.0 / (k + t.text_rank), 0.0))
      as rrf_score,
      coalesce(v.vec_similarity, 0) as similarity
    from vector_results v
    full outer join text_results t on v.chunk_id = t.chunk_id
  )
  select
    c.meeting_id,
    c.chunk_text,
    c.chunk_type,
    c.rrf_score as similarity,
    m.title as meeting_title,
    m.created_at as meeting_date
  from combined c
  join public.meetings m on m.id = c.meeting_id
  order by c.rrf_score desc
  limit match_count;
end;
$$;

-- Keep the pure vector search function as fallback
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
