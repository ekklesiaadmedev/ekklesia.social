-- Force PostgREST to reload its schema cache after DDL changes
-- This helps when new columns (e.g., attendant_id) are not recognized immediately.
NOTIFY pgrst, 'reload schema';