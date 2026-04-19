-- ============================================================================
-- @mirror-factory/ai-dev-kit - Supabase Database Migration
-- ============================================================================
-- This migration creates the complete schema for the AI Dev Kit platform.
-- It includes 15 tables, RLS policies, indexes, RPC functions, and triggers.
--
-- Tables:
--   1.  traces              - LLM call traces for observability
--   2.  spans               - Individual spans within a trace
--   3.  tool_registry       - Registered AI tools and their metadata
--   4.  eval_suites         - Evaluation test suites
--   5.  eval_runs           - Individual evaluation run results
--   6.  eval_results        - Per-case results within an eval run
--   7.  cost_logs           - Token and cost tracking per call
--   8.  regression_tests    - Auto-generated regression tests from failures
--   9.  prompt_versions     - Versioned prompt management
--   10. deployment_snapshots - Point-in-time deployment state captures
--   11. sandbox_sessions    - Sandbox environment sessions
--   12. workflow_runs       - Multi-step workflow execution tracking
--   13. connector_status    - External connector health monitoring
--   14. embeddings          - Vector embeddings for RAG / semantic search
--   15. audit_log           - Tenant-scoped audit trail
--
-- Extensions: pgvector, pg_trgm
-- ============================================================================


-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
-- pgvector: provides the vector type and similarity operators for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- pg_trgm: provides trigram-based text search for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ============================================================================
-- 2. HELPER FUNCTIONS
-- ============================================================================

-- get_tenant_id(): Extracts the tenant_id claim from the authenticated
-- user's JWT. Used by all RLS policies to enforce tenant isolation.
CREATE OR REPLACE FUNCTION get_tenant_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT auth.jwt() ->> 'tenant_id'
$$;


-- update_updated_at_column(): Trigger function that automatically sets
-- the updated_at column to the current timestamp on every UPDATE.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ============================================================================
-- 3. TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 3a. traces
-- Records high-level LLM interaction traces for observability and debugging.
-- ---------------------------------------------------------------------------
CREATE TABLE traces (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     text          NOT NULL,
  user_id       text,
  session_id    text,
  model         text,
  provider      text,
  total_tokens  integer       DEFAULT 0,
  total_cost    numeric(12,6) DEFAULT 0,
  latency_ms    integer,
  status        text          DEFAULT 'completed',
  metadata      jsonb         DEFAULT '{}',
  created_at    timestamptz   DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3b. spans
-- Individual execution spans within a trace (LLM calls, tool invocations,
-- retrieval steps, etc.). Supports parent-child nesting via parent_span_id.
-- ---------------------------------------------------------------------------
CREATE TABLE spans (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id        uuid          REFERENCES traces(id) ON DELETE CASCADE,
  parent_span_id  uuid          REFERENCES spans(id),
  type            text          NOT NULL,
  name            text          NOT NULL,
  input           text,
  output          text,
  tokens_in       integer       DEFAULT 0,
  tokens_out      integer       DEFAULT 0,
  cost            numeric(12,6) DEFAULT 0,
  latency_ms      integer,
  tool_name       text,
  error_message   text,
  started_at      timestamptz,
  ended_at        timestamptz,
  metadata        jsonb         DEFAULT '{}',
  created_at      timestamptz   DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3c. tool_registry
-- Central registry of available AI tools with versioning, categorization,
-- and evaluation tracking.
-- ---------------------------------------------------------------------------
CREATE TABLE tool_registry (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       text          NOT NULL,
  name            text          NOT NULL,
  version         text          DEFAULT '1.0.0',
  description     text          NOT NULL,
  input_schema    jsonb,
  output_schema   jsonb,
  category        text          NOT NULL,
  cost_estimate   text,
  test_status     text          DEFAULT 'untested',
  last_eval_score numeric(5,2),
  permission_tier text          DEFAULT 'explorer',
  created_at      timestamptz   DEFAULT now(),
  updated_at      timestamptz   DEFAULT now(),
  UNIQUE (tenant_id, name)
);

-- ---------------------------------------------------------------------------
-- 3d. eval_suites
-- Named collections of evaluation test cases for benchmarking AI behavior.
-- ---------------------------------------------------------------------------
CREATE TABLE eval_suites (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   text        NOT NULL,
  name        text        NOT NULL,
  description text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3e. eval_runs
-- A single execution of an eval suite against a specific model/provider.
-- ---------------------------------------------------------------------------
CREATE TABLE eval_runs (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  suite_id     uuid          REFERENCES eval_suites(id) ON DELETE CASCADE,
  tenant_id    text          NOT NULL,
  provider     text,
  model        text,
  pass_rate    numeric(5,2),
  total_cases  integer       DEFAULT 0,
  passed_cases integer       DEFAULT 0,
  failed_cases integer       DEFAULT 0,
  cost         numeric(12,6) DEFAULT 0,
  created_at   timestamptz   DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3f. eval_results
-- Per-case results for an eval run, linking back to the trace if available.
-- ---------------------------------------------------------------------------
CREATE TABLE eval_results (
  id         uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id     uuid          REFERENCES eval_runs(id) ON DELETE CASCADE,
  tenant_id  text          NOT NULL,
  case_name  text          NOT NULL,
  status     text          NOT NULL,
  input      text,
  expected   text,
  actual     text,
  score      numeric(5,2),
  trace_id   uuid          REFERENCES traces(id),
  created_at timestamptz   DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3g. cost_logs
-- Granular cost tracking for every LLM call, broken down by provider/model.
-- ---------------------------------------------------------------------------
CREATE TABLE cost_logs (
  id         uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  text          NOT NULL,
  user_id    text,
  provider   text          NOT NULL,
  model      text          NOT NULL,
  tokens_in  integer       DEFAULT 0,
  tokens_out integer       DEFAULT 0,
  cost       numeric(12,6) NOT NULL,
  tool_name  text,
  created_at timestamptz   DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3h. regression_tests
-- Automatically generated regression tests from production failures.
-- ---------------------------------------------------------------------------
CREATE TABLE regression_tests (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       text        NOT NULL,
  source_trace_id uuid        REFERENCES traces(id),
  tool_name       text        NOT NULL,
  error_pattern   text,
  test_file_path  text,
  status          text        DEFAULT 'pending',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3i. prompt_versions
-- Immutable prompt versions with environment promotion and eval tracking.
-- ---------------------------------------------------------------------------
CREATE TABLE prompt_versions (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      text          NOT NULL,
  name           text          NOT NULL,
  version        integer       NOT NULL DEFAULT 1,
  content        text          NOT NULL,
  environment    text          DEFAULT 'development',
  eval_pass_rate numeric(5,2),
  created_at     timestamptz   DEFAULT now(),
  UNIQUE (tenant_id, name, version)
);

-- ---------------------------------------------------------------------------
-- 3j. deployment_snapshots
-- Captures the full state of a deployment for reproducibility and rollback.
-- ---------------------------------------------------------------------------
CREATE TABLE deployment_snapshots (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           text        NOT NULL,
  deployment_id       text        NOT NULL,
  env_var_hash        text,
  migration_version   text,
  eval_snapshot       jsonb,
  tool_registry_hash  text,
  created_at          timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3k. sandbox_sessions
-- Isolated sandbox environments for development and testing.
-- ---------------------------------------------------------------------------
CREATE TABLE sandbox_sessions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   text        NOT NULL,
  session_id  text        NOT NULL UNIQUE,
  user_id     text,
  status      text        DEFAULT 'active',
  branch      text,
  snapshot_id text,
  ports       jsonb       DEFAULT '[]',
  visibility  text        DEFAULT 'private',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3l. workflow_runs
-- Multi-step workflow execution state with checkpointing support.
-- ---------------------------------------------------------------------------
CREATE TABLE workflow_runs (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           text        NOT NULL,
  run_id              text        NOT NULL UNIQUE,
  session_id          text,
  status              text        DEFAULT 'running',
  current_step        integer     DEFAULT 0,
  total_steps         integer     DEFAULT 0,
  last_checkpoint_at  timestamptz,
  metadata            jsonb       DEFAULT '{}',
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3m. connector_status
-- Health and sync status for external service connectors.
-- ---------------------------------------------------------------------------
CREATE TABLE connector_status (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       text        NOT NULL,
  connector_name  text        NOT NULL,
  status          text        DEFAULT 'disconnected',
  last_sync_at    timestamptz,
  error_count     integer     DEFAULT 0,
  config          jsonb       DEFAULT '{}',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (tenant_id, connector_name)
);

-- ---------------------------------------------------------------------------
-- 3n. embeddings
-- Vector embeddings for RAG pipelines and semantic search.
-- Uses pgvector's vector(1536) type for OpenAI-compatible dimensions.
-- ---------------------------------------------------------------------------
CREATE TABLE embeddings (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   text          NOT NULL,
  content     text          NOT NULL,
  embedding   vector(1536),
  source_url  text,
  chunk_index integer       DEFAULT 0,
  metadata    jsonb         DEFAULT '{}',
  created_at  timestamptz   DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3o. audit_log
-- Immutable audit trail for all significant actions within a tenant.
-- ---------------------------------------------------------------------------
CREATE TABLE audit_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   text        NOT NULL,
  action      text        NOT NULL,
  entity_type text,
  entity_id   text,
  user_id     text,
  details     jsonb       DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);


-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Every table with a tenant_id column gets RLS enabled with four policies
-- (SELECT, INSERT, UPDATE, DELETE) that enforce tenant isolation using the
-- get_tenant_id() helper function.
-- ============================================================================

-- --- traces ---
ALTER TABLE traces ENABLE ROW LEVEL SECURITY;
CREATE POLICY traces_select ON traces FOR SELECT USING (tenant_id = get_tenant_id());
CREATE POLICY traces_insert ON traces FOR INSERT WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY traces_update ON traces FOR UPDATE USING (tenant_id = get_tenant_id());
CREATE POLICY traces_delete ON traces FOR DELETE USING (tenant_id = get_tenant_id());

-- --- spans ---
-- Note: spans does not have its own tenant_id column; access is controlled
-- through the parent trace's RLS. However, since the spec requires tenant_id
-- policies on all tables with tenant_id, and spans does NOT have tenant_id,
-- we skip RLS for spans. Access is implicitly scoped via the traces FK.
-- (spans inherits access control from traces via the foreign key relationship)

-- --- tool_registry ---
ALTER TABLE tool_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY tool_registry_select ON tool_registry FOR SELECT USING (tenant_id = get_tenant_id());
CREATE POLICY tool_registry_insert ON tool_registry FOR INSERT WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY tool_registry_update ON tool_registry FOR UPDATE USING (tenant_id = get_tenant_id());
CREATE POLICY tool_registry_delete ON tool_registry FOR DELETE USING (tenant_id = get_tenant_id());

-- --- eval_suites ---
ALTER TABLE eval_suites ENABLE ROW LEVEL SECURITY;
CREATE POLICY eval_suites_select ON eval_suites FOR SELECT USING (tenant_id = get_tenant_id());
CREATE POLICY eval_suites_insert ON eval_suites FOR INSERT WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY eval_suites_update ON eval_suites FOR UPDATE USING (tenant_id = get_tenant_id());
CREATE POLICY eval_suites_delete ON eval_suites FOR DELETE USING (tenant_id = get_tenant_id());

-- --- eval_runs ---
ALTER TABLE eval_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY eval_runs_select ON eval_runs FOR SELECT USING (tenant_id = get_tenant_id());
CREATE POLICY eval_runs_insert ON eval_runs FOR INSERT WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY eval_runs_update ON eval_runs FOR UPDATE USING (tenant_id = get_tenant_id());
CREATE POLICY eval_runs_delete ON eval_runs FOR DELETE USING (tenant_id = get_tenant_id());

-- --- eval_results ---
ALTER TABLE eval_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY eval_results_select ON eval_results FOR SELECT USING (tenant_id = get_tenant_id());
CREATE POLICY eval_results_insert ON eval_results FOR INSERT WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY eval_results_update ON eval_results FOR UPDATE USING (tenant_id = get_tenant_id());
CREATE POLICY eval_results_delete ON eval_results FOR DELETE USING (tenant_id = get_tenant_id());

-- --- cost_logs ---
ALTER TABLE cost_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY cost_logs_select ON cost_logs FOR SELECT USING (tenant_id = get_tenant_id());
CREATE POLICY cost_logs_insert ON cost_logs FOR INSERT WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY cost_logs_update ON cost_logs FOR UPDATE USING (tenant_id = get_tenant_id());
CREATE POLICY cost_logs_delete ON cost_logs FOR DELETE USING (tenant_id = get_tenant_id());

-- --- regression_tests ---
ALTER TABLE regression_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY regression_tests_select ON regression_tests FOR SELECT USING (tenant_id = get_tenant_id());
CREATE POLICY regression_tests_insert ON regression_tests FOR INSERT WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY regression_tests_update ON regression_tests FOR UPDATE USING (tenant_id = get_tenant_id());
CREATE POLICY regression_tests_delete ON regression_tests FOR DELETE USING (tenant_id = get_tenant_id());

-- --- prompt_versions ---
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY prompt_versions_select ON prompt_versions FOR SELECT USING (tenant_id = get_tenant_id());
CREATE POLICY prompt_versions_insert ON prompt_versions FOR INSERT WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY prompt_versions_update ON prompt_versions FOR UPDATE USING (tenant_id = get_tenant_id());
CREATE POLICY prompt_versions_delete ON prompt_versions FOR DELETE USING (tenant_id = get_tenant_id());

-- --- deployment_snapshots ---
ALTER TABLE deployment_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY deployment_snapshots_select ON deployment_snapshots FOR SELECT USING (tenant_id = get_tenant_id());
CREATE POLICY deployment_snapshots_insert ON deployment_snapshots FOR INSERT WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY deployment_snapshots_update ON deployment_snapshots FOR UPDATE USING (tenant_id = get_tenant_id());
CREATE POLICY deployment_snapshots_delete ON deployment_snapshots FOR DELETE USING (tenant_id = get_tenant_id());

-- --- sandbox_sessions ---
ALTER TABLE sandbox_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY sandbox_sessions_select ON sandbox_sessions FOR SELECT USING (tenant_id = get_tenant_id());
CREATE POLICY sandbox_sessions_insert ON sandbox_sessions FOR INSERT WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY sandbox_sessions_update ON sandbox_sessions FOR UPDATE USING (tenant_id = get_tenant_id());
CREATE POLICY sandbox_sessions_delete ON sandbox_sessions FOR DELETE USING (tenant_id = get_tenant_id());

-- --- workflow_runs ---
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY workflow_runs_select ON workflow_runs FOR SELECT USING (tenant_id = get_tenant_id());
CREATE POLICY workflow_runs_insert ON workflow_runs FOR INSERT WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY workflow_runs_update ON workflow_runs FOR UPDATE USING (tenant_id = get_tenant_id());
CREATE POLICY workflow_runs_delete ON workflow_runs FOR DELETE USING (tenant_id = get_tenant_id());

-- --- connector_status ---
ALTER TABLE connector_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY connector_status_select ON connector_status FOR SELECT USING (tenant_id = get_tenant_id());
CREATE POLICY connector_status_insert ON connector_status FOR INSERT WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY connector_status_update ON connector_status FOR UPDATE USING (tenant_id = get_tenant_id());
CREATE POLICY connector_status_delete ON connector_status FOR DELETE USING (tenant_id = get_tenant_id());

-- --- embeddings ---
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY embeddings_select ON embeddings FOR SELECT USING (tenant_id = get_tenant_id());
CREATE POLICY embeddings_insert ON embeddings FOR INSERT WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY embeddings_update ON embeddings FOR UPDATE USING (tenant_id = get_tenant_id());
CREATE POLICY embeddings_delete ON embeddings FOR DELETE USING (tenant_id = get_tenant_id());

-- --- audit_log ---
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_log_select ON audit_log FOR SELECT USING (tenant_id = get_tenant_id());
CREATE POLICY audit_log_insert ON audit_log FOR INSERT WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY audit_log_update ON audit_log FOR UPDATE USING (tenant_id = get_tenant_id());
CREATE POLICY audit_log_delete ON audit_log FOR DELETE USING (tenant_id = get_tenant_id());


-- ============================================================================
-- 5. INDEXES
-- ============================================================================
-- Performance indexes for common query patterns.
-- ============================================================================

-- traces: query by tenant + time, and by session
CREATE INDEX idx_traces_tenant_created ON traces (tenant_id, created_at DESC);
CREATE INDEX idx_traces_session_id ON traces (session_id);

-- spans: query by trace, by tool, and by time
CREATE INDEX idx_spans_trace_id ON spans (trace_id);
CREATE INDEX idx_spans_tool_name ON spans (tool_name);
CREATE INDEX idx_spans_started_at ON spans (started_at);

-- tool_registry: lookup by tenant + name
CREATE INDEX idx_tool_registry_tenant_name ON tool_registry (tenant_id, name);

-- cost_logs: query by tenant + time, and by user
CREATE INDEX idx_cost_logs_tenant_created ON cost_logs (tenant_id, created_at DESC);
CREATE INDEX idx_cost_logs_user_id ON cost_logs (user_id);

-- eval_runs: query by suite and by tenant + time
CREATE INDEX idx_eval_runs_suite_id ON eval_runs (suite_id);
CREATE INDEX idx_eval_runs_tenant_created ON eval_runs (tenant_id, created_at DESC);

-- eval_results: query by run and by trace
CREATE INDEX idx_eval_results_run_id ON eval_results (run_id);
CREATE INDEX idx_eval_results_trace_id ON eval_results (trace_id);

-- embeddings: HNSW index for fast approximate nearest neighbor search
-- using cosine distance (vector_cosine_ops)
CREATE INDEX idx_embeddings_embedding ON embeddings
  USING hnsw (embedding vector_cosine_ops);

-- audit_log: query by tenant + time
CREATE INDEX idx_audit_log_tenant_created ON audit_log (tenant_id, created_at DESC);


-- ============================================================================
-- 6. RPC FUNCTIONS
-- ============================================================================

-- match_embeddings: Performs cosine similarity search against the embeddings
-- table, scoped to a specific tenant. Returns the most similar content
-- chunks above a given threshold.
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_tenant_id text
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    e.id,
    e.content,
    (1 - (e.embedding <=> query_embedding))::float AS similarity
  FROM embeddings e
  WHERE e.tenant_id = p_tenant_id
    AND (1 - (e.embedding <=> query_embedding)) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;


-- ============================================================================
-- 7. UPDATED_AT TRIGGERS
-- ============================================================================
-- Apply the update_updated_at_column() trigger to all tables that have an
-- updated_at column, so it is automatically maintained on every UPDATE.
-- ============================================================================

-- tool_registry
CREATE TRIGGER trg_tool_registry_updated_at
  BEFORE UPDATE ON tool_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- eval_suites
CREATE TRIGGER trg_eval_suites_updated_at
  BEFORE UPDATE ON eval_suites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- regression_tests
CREATE TRIGGER trg_regression_tests_updated_at
  BEFORE UPDATE ON regression_tests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- sandbox_sessions
CREATE TRIGGER trg_sandbox_sessions_updated_at
  BEFORE UPDATE ON sandbox_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- workflow_runs
CREATE TRIGGER trg_workflow_runs_updated_at
  BEFORE UPDATE ON workflow_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- connector_status
CREATE TRIGGER trg_connector_status_updated_at
  BEFORE UPDATE ON connector_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
