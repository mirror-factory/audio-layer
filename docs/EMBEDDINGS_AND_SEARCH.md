# Layers — Embeddings & Semantic Search

**Last updated:** 2026-04-22
**Status:** Live

---

## Overview

Every completed meeting is automatically embedded into vector space and indexed for semantic + keyword search. Users can search across all their conversations by meaning ("what was the budget discussion?") and by exact terms ("$240K", "Thursday deadline").

---

## Architecture

```
Meeting completed
    ↓
Transcript + Summary + Intake chunked (~500 tokens each)
    ↓
Chunks embedded via AI Gateway (text-embedding-3-small, 1536d)
    ↓
Stored in Supabase pgvector (HNSW index) + tsvector (BM25 index)
    ↓
Search query → embed query → hybrid search (vector + BM25 + RRF)
    ↓
Ranked results with meeting context
```

---

## 1. Chunking Strategy

### What We Do
- Split transcript into **~500-token chunks** with **50-word overlap**
- Chunk summary and intake form separately with type tags
- Three chunk types: `transcript`, `summary`, `intake`

### Why 500 Tokens
| Chunk Size | Problem |
|-----------|---------|
| 100 tokens | Loses context — fragments of sentences, no coherent meaning |
| 500 tokens | Sweet spot — contains a complete thought/topic |
| 2000 tokens | Embedding dilutes meaning — search returns irrelevant paragraphs |

### Why 50-Word Overlap
A sentence split at a chunk boundary appears in both adjacent chunks. Without overlap, queries about content at the boundary would miss relevant results.

### Why Three Chunk Types
Searching "what was the budget" finds:
- The **transcript** chunk where the budget was spoken
- The **intake** chunk where the budget was extracted as structured data
- The **summary** chunk where the budget was highlighted as a key point

### Implementation
- **File:** `lib/embeddings/chunk.ts`
- `chunkText(text, maxTokens=500)` — word-based chunking with overlap
- `estimateTokenCount(text)` — approximation (words × 1.3)

### References
- [Chunking strategies for RAG — LangChain](https://python.langchain.com/docs/how_to/#text-splitters)
- [Optimal chunk sizes for embeddings — OpenAI Cookbook](https://cookbook.openai.com/examples/embedding_wikipedia_articles_for_search)

---

## 2. Embedding Model

### What We Use
**OpenAI `text-embedding-3-small`** (1536 dimensions) via Vercel AI Gateway

### Why This Model

| Model | Dimensions | Cost/1M tokens | Quality (MTEB) | Our Choice |
|-------|-----------|----------------|----------------|------------|
| text-embedding-3-small | 1536 | $0.02 | Good | **Yes** |
| text-embedding-3-large | 3072 | $0.13 | Better | Overkill for text-only |
| Cohere Embed v4 | 1024 | $0.10 | Best for RAG | Different API integration |
| Gemini Embedding 2 | 768 | $0.00 (free tier) | Multimodal | Not needed for text |
| Voyage Multimodal 3.5 | 1024 | $0.06 | Best for code | Wrong domain |

**Decision:** `text-embedding-3-small` is the best price/performance for text-only meeting search. Meetings are natural language, not code or images. The AI Gateway routes it at zero markup with the same auth key we already use.

### Cost Per Meeting

| Component | Tokens | Cost |
|-----------|--------|------|
| 30-min transcript | ~7,000 | $0.00014 |
| Summary + intake | ~1,500 | $0.00003 |
| **Total per meeting** | **~8,500** | **$0.00017** |
| Search query | ~150 | $0.000003 |

At 1,000 meetings/month: **$0.17/month** total embedding cost.

### Implementation
- **File:** `lib/embeddings/client.ts`
- `embedText(text)` — calls AI Gateway `/v1/embeddings` endpoint
- Wrapped with `withExternalCall` for observability + cost tracking
- Returns `number[]` (1536-dimensional vector)

### References
- [OpenAI Embeddings Pricing](https://openai.com/pricing)
- [Best Embedding Models 2026 — Milvus](https://milvus.io/blog/choose-embedding-model-rag-2026.md)
- [Best Open-Source Embedding Models 2026 — BentoML](https://www.bentoml.com/blog/a-guide-to-open-source-embedding-models)
- [Embedding Models Benchmark 2026](https://zc277584121.github.io/rag/2026/03/20/embedding-models-benchmark-2026.html)

---

## 3. Vector Index: HNSW

### What We Use
**HNSW** (Hierarchical Navigable Small World) index on pgvector with `m=16, ef_construction=64`

### Why HNSW Over IVFFlat

| Metric | IVFFlat | HNSW |
|--------|---------|------|
| Query speed | 2.6 QPS | **40.5 QPS** (15x faster) |
| Build time | 128s | 4065s (slower, but one-time) |
| Recall | Depends on `lists` param | **High recall by default** |
| Insert handling | Needs periodic `REINDEX` | **Handles inserts natively** |
| Tuning required | Yes (`lists` must match data) | **Minimal** |
| Best for | Static datasets >1M rows | **Dynamic datasets <1M rows** |

**Decision:** We insert new meetings constantly and have <1M embedding chunks. HNSW is the correct choice — it handles inserts without degradation and doesn't need tuning.

### Configuration
```sql
CREATE INDEX meeting_embeddings_vector_idx
  ON meeting_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

- `m=16` — connections per node (higher = better recall, more memory)
- `ef_construction=64` — build-time search width (higher = better index quality, slower build)
- `vector_cosine_ops` — cosine similarity distance function

### Implementation
- **File:** `lib/supabase/embeddings-schema.sql`
- Table: `meeting_embeddings` with `vector(1536)` column
- RLS policies scope all operations to `auth.uid() = user_id`

### References
- [pgvector HNSW vs IVFFlat — AWS](https://aws.amazon.com/blogs/database/optimize-generative-ai-applications-with-pgvector-indexing-a-deep-dive-into-ivfflat-and-hnsw-techniques/)
- [pgvector Index Selection 2026 — Medium](https://medium.com/@philmcc/pgvector-index-selection-ivfflat-vs-hnsw-for-postgresql-vector-search-6eff26aaa90c)
- [Choosing Your Index with PGVector — Pixion](https://pixion.co/blog/choosing-your-index-with-pg-vector-flat-vs-hnsw-vs-ivfflat)

---

## 4. Hybrid Search: Vector + BM25 + RRF

### What We Do
Every search runs **two parallel retrieval paths** and merges results:

1. **Vector similarity** (semantic) — "what does this mean?"
2. **BM25 full-text** (keyword) — "does this exact word appear?"
3. **Reciprocal Rank Fusion** — merges both ranked lists into one

### Why Hybrid Beats Pure Vector

| Query | Pure Vector | Hybrid |
|-------|------------|--------|
| "what was the budget" | ✅ Finds discussions about money | ✅ Same + exact "budget" keyword |
| "John mentioned Thursday" | ⚠️ Approximate match | ✅ Exact "John" + "Thursday" |
| "$240K allocation" | ❌ Numbers embed poorly | ✅ BM25 catches exact "$240K" |
| "marketing strategy" | ✅ Semantic match | ✅ Better ranking with both signals |
| "action items from standup" | ✅ Semantic match | ✅ Same + keyword boost |

### Reciprocal Rank Fusion (RRF)

```
score = vector_weight × (1/(k + vector_rank)) + (1 - vector_weight) × (1/(k + text_rank))
```

- `vector_weight = 0.7` — 70% semantic, 30% keyword (configurable)
- `k = 60` — smoothing constant (standard RRF value)
- Prevents any single high-ranked result from dominating

### Full-Text Search Column
```sql
fts tsvector GENERATED ALWAYS AS (to_tsvector('english', chunk_text)) STORED
```
- Auto-maintained by Postgres — no application code needed
- GIN index for fast full-text queries
- `websearch_to_tsquery` supports natural language queries ("budget AND timeline")

### Implementation
- **File:** `lib/embeddings/search.ts` — `searchMeetings()` function
- **File:** `lib/supabase/embeddings-schema.sql` — `hybrid_search_meetings()` RPC
- Falls back to pure vector search if hybrid RPC isn't deployed yet
- **File:** `app/api/search/route.ts` — `POST /api/search` endpoint
- **File:** `app/search/page.tsx` — search UI

### References
- [Hybrid Search: BM25 + Semantic — LanceDB](https://www.lancedb.com/blog/hybrid-search-combining-bm25-and-semantic-search-for-better-results-with-lan-1358038fe7e6)
- [Full-text Search for RAG — Redis](https://redis.io/blog/full-text-search-for-rag-the-precision-layer/)
- [Hybrid Search Guide — Elastic](https://www.elastic.co/what-is/hybrid-search)

---

## 5. MCP Server

### What It Is
A Model Context Protocol server that lets any AI assistant (Claude, Cursor, etc.) access your Layers meetings.

### Tools Available

| Tool | Description |
|------|------------|
| `search_meetings` | Semantic + keyword search across all conversations |
| `get_meeting` | Full meeting with transcript, summary, intake, cost |
| `list_meetings` | Recent meetings with status |
| `get_transcript` | Raw transcript text for a meeting |
| `get_summary` | AI-generated summary for a meeting |
| `start_recording` | Mint a streaming token to start live recording |
| `show_meeting_dashboard` | Claude MCP App UI for recent meetings |

### Authentication
Currently: **API key** (Bearer token) — generate on your profile page.

Connection config for Claude Desktop / `.mcp.json`:
```json
{
  "mcpServers": {
    "layers": {
      "url": "https://audio-layer.vercel.app/api/mcp/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

### Implementation
- **File:** `lib/mcp/tools.ts` — 7 tool definitions with Zod schemas
- **File:** `lib/mcp/auth.ts` — API key validation against profiles table
- **File:** `app/api/mcp/route.ts` — JSON-RPC endpoint
- **File:** `lib/mcp/ui.ts` — Claude MCP App HTML resource helpers
- **File:** `app/api/auth/api-key/route.ts` — key management (generate/view/revoke)

---

## 6. Cost Tracking

Embedding costs are tracked alongside STT and LLM costs in the `cost_breakdown` field on each meeting:

```typescript
interface MeetingCostBreakdown {
  stt: SttCostDetail;
  llm: LlmCostDetail;
  embedding?: {
    model: string;          // "text-embedding-3-small"
    totalTokens: number;    // ~8,500 for a 30-min meeting
    totalCostUsd: number;   // ~$0.00017
  };
  totalCostUsd: number;     // stt + llm + embedding
}
```

Visible on:
- Meeting detail page (cost panel)
- Usage dashboard (/usage)
- Dev-kit dashboard (/dev-kit/cost)

---

## 7. Database Schema

Run `lib/supabase/embeddings-schema.sql` in Supabase SQL Editor to create:

| Object | Type | Purpose |
|--------|------|---------|
| `meeting_embeddings` | Table | Chunk text + embedding vectors + FTS |
| `meeting_embeddings_vector_idx` | HNSW Index | Fast cosine similarity queries |
| `meeting_embeddings_fts_idx` | GIN Index | Fast full-text search |
| `hybrid_search_meetings` | RPC Function | Combined vector + BM25 + RRF search |
| `match_meeting_embeddings` | RPC Function | Pure vector search (fallback) |
| `profiles.api_key` | Column | MCP API key per user |

---

## 8. Auto-Embedding Flow

Embeddings are generated automatically after every meeting completion:

1. Meeting finalized (batch or streaming)
2. `after()` callback runs `embedMeeting(meetingId, userId)`
3. Transcript, summary, and intake are chunked
4. Each chunk is embedded via AI Gateway
5. Embeddings inserted into `meeting_embeddings`
6. Embedding cost added to `cost_breakdown`

This runs in the background (`after()`) so it doesn't block the API response.

### Implementation
- **File:** `lib/embeddings/embed-meeting.ts` — orchestrates chunking + embedding + insert
- **File:** `app/api/transcribe/[id]/route.ts` — auto-embeds on batch completion
- **File:** `app/api/transcribe/stream/finalize/route.ts` — auto-embeds on streaming completion
