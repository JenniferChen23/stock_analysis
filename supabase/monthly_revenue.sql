-- 月營收（每月更新）。貼到 Supabase SQL Editor 執行一次即可。
create table if not exists monthly_revenue (
  code        text not null,
  year        int  not null,   -- 西元年
  month       int  not null,   -- 1~12
  revenue     bigint,          -- 當月營收（千元）
  yoy         numeric(8,2),    -- 去年同月增減 (%)
  updated_at  timestamptz default now(),
  unique (code, year, month)
);

alter table monthly_revenue enable row level security;
create policy "public read monthly_revenue" on monthly_revenue for select using (true);
