CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.match_cached_search(_query TEXT, _platform TEXT, _language TEXT, _threshold REAL DEFAULT 0.55)
RETURNS TABLE (id UUID, raw_query TEXT, results JSONB, analysis TEXT, similarity REAL, updated_at TIMESTAMP WITH TIME ZONE)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT c.id, c.raw_query, c.results, c.analysis,
         extensions.similarity(c.query_norm, _query) AS similarity, c.updated_at
  FROM public.search_cache c
  WHERE c.platform = _platform
    AND c.language = _language
    AND extensions.similarity(c.query_norm, _query) >= _threshold
  ORDER BY extensions.similarity(c.query_norm, _query) DESC
  LIMIT 1
$$;

ALTER FUNCTION public.set_updated_at() SET search_path = public;

CREATE POLICY "Taste profiles are server-managed only" ON public.taste_profiles FOR SELECT TO anon, authenticated USING (false);