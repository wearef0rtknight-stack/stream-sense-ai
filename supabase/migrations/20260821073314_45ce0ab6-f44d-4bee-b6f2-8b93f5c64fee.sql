CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.titles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  year INTEGER,
  category TEXT,
  platform TEXT,
  stream_url TEXT,
  poster_url TEXT,
  runtime TEXT,
  genres TEXT[] NOT NULL DEFAULT '{}',
  audio_tracks TEXT[] NOT NULL DEFAULT '{}',
  hindi_status TEXT NOT NULL DEFAULT 'none',
  hindi_verified_on TIMESTAMP WITH TIME ZONE,
  rating_rt INTEGER,
  rating_imdb NUMERIC,
  budget TEXT,
  box_office TEXT,
  analysis TEXT,
  availability_ok BOOLEAN NOT NULL DEFAULT true,
  last_checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.titles TO anon, authenticated;
GRANT ALL ON public.titles TO service_role;
ALTER TABLE public.titles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Titles are publicly readable" ON public.titles FOR SELECT TO anon, authenticated USING (true);
CREATE TRIGGER titles_updated_at BEFORE UPDATE ON public.titles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX titles_last_checked_idx ON public.titles (last_checked_at ASC);
CREATE INDEX titles_name_trgm_idx ON public.titles USING gin (name gin_trgm_ops);

CREATE TABLE public.search_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query_norm TEXT NOT NULL,
  raw_query TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT '',
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  analysis TEXT,
  hit_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (query_norm, platform, language)
);

GRANT SELECT ON public.search_cache TO anon, authenticated;
GRANT ALL ON public.search_cache TO service_role;
ALTER TABLE public.search_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cached searches are publicly readable" ON public.search_cache FOR SELECT TO anon, authenticated USING (true);
CREATE TRIGGER search_cache_updated_at BEFORE UPDATE ON public.search_cache FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX search_cache_query_trgm_idx ON public.search_cache USING gin (query_norm gin_trgm_ops);

CREATE TABLE public.taste_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_key TEXT NOT NULL UNIQUE,
  user_id UUID,
  weights JSONB NOT NULL DEFAULT '{}'::jsonb,
  searches JSONB NOT NULL DEFAULT '[]'::jsonb,
  interactions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.taste_profiles TO service_role;
ALTER TABLE public.taste_profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER taste_profiles_updated_at BEFORE UPDATE ON public.taste_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.match_cached_search(_query TEXT, _platform TEXT, _language TEXT, _threshold REAL DEFAULT 0.55)
RETURNS TABLE (id UUID, raw_query TEXT, results JSONB, analysis TEXT, similarity REAL, updated_at TIMESTAMP WITH TIME ZONE)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.raw_query, c.results, c.analysis,
         similarity(c.query_norm, _query) AS similarity, c.updated_at
  FROM public.search_cache c
  WHERE c.platform = _platform
    AND c.language = _language
    AND similarity(c.query_norm, _query) >= _threshold
  ORDER BY similarity(c.query_norm, _query) DESC
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.match_cached_search(TEXT, TEXT, TEXT, REAL) TO anon, authenticated, service_role;