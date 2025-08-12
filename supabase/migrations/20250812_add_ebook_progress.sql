alter table public.ebooks
  add column if not exists last_page int,
  add column if not exists last_zoom text;
