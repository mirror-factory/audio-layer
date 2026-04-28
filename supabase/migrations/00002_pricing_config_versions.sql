-- Versioned admin pricing configuration.
-- The app can fall back to .ai-dev-kit/pricing-config.json locally, but
-- production should use this table through the service-role admin API.

create table if not exists pricing_config_versions (
  id            text primary key,
  name          text not null,
  status        text not null default 'draft'
                check (status in ('draft', 'active', 'archived')),
  starts_at     timestamptz not null default now(),
  activated_at  timestamptz,
  config        jsonb not null,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists pricing_config_versions_status_idx
  on pricing_config_versions (status, created_at desc);

drop trigger if exists pricing_config_versions_touch on pricing_config_versions;
create trigger pricing_config_versions_touch
before update on pricing_config_versions
for each row execute function meetings_touch_updated_at();

alter table pricing_config_versions enable row level security;

-- No anon/auth policies: reads and writes go through service-role guarded
-- admin routes only.
