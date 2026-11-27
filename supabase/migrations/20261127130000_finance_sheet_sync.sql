-- Finance BCC sheet sync (27 Nov 2026): the "Regional / Global Master List"
-- Google Sheet pushes its Finance tab to the sync-finance-contacts function
-- whenever it changes (an Apps Script in the sheet, docs/finance-sheet-sync.gs).
--
-- The script proves who it is with a key. Only the key's SHA-256 is stored,
-- here, in a table nobody but the server can read (RLS on, no policies).
-- The value is added directly, never committed: the repository is public.

CREATE TABLE IF NOT EXISTS public.integration_keys (
  name text PRIMARY KEY,
  key_sha256 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.integration_keys FROM anon, authenticated;
GRANT ALL ON public.integration_keys TO service_role;
ALTER TABLE public.integration_keys ENABLE ROW LEVEL SECURITY;
