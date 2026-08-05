-- The Portfolio-Assistent (AI chat) feature was removed from the app.
-- Drop its quota table and RPC (created in 20260623_ai_chat_usage.sql).
-- The document-extraction quota (ai_extraction_usage / consume_ai_extraction)
-- is a separate feature and stays.

drop function if exists public.consume_ai_chat(int);
drop table if exists public.ai_chat_usage;
