-- 個股財務指標（每季更新）
create table if not exists financials (
  id            bigint generated always as identity primary key,
  code          text not null,
  year          int  not null,
  quarter       int  not null,
  revenue       bigint,
  gross_profit  bigint,
  net_income    bigint,
  eps           numeric(8,2),
  gross_margin  numeric(5,2),
  operating_margin numeric(5,2),
  net_margin    numeric(5,2),
  roe           numeric(5,2),
  roa           numeric(5,2),
  debt_ratio    numeric(5,2),
  current_ratio numeric(6,2),
  updated_at    timestamptz default now(),
  unique (code, year, quarter)
);

-- 篩選用摘要表（每季從 financials 聚合）
create table if not exists stock_summary (
  code              text primary key,
  name              text,
  sector            text,
  price             numeric(10,2),
  eps               numeric(8,2),
  pe                numeric(6,2),
  roe               numeric(5,2),
  gross_margin      numeric(5,2),
  debt_ratio        numeric(5,2),
  current_ratio     numeric(6,2),
  dividend_yield    numeric(5,2),
  revenue_growth_yoy numeric(6,2),
  eps_growth_yoy    numeric(6,2),
  updated_at        timestamptz default now()
);

-- 讓前端可以直接讀（開啟 RLS public read）
alter table financials enable row level security;
alter table stock_summary enable row level security;

create policy "public read financials" on financials for select using (true);
create policy "public read stock_summary" on stock_summary for select using (true);
