UPDATE public.index_records SET status = 'verified' WHERE status = 'pending';
ALTER TABLE public.index_records ALTER COLUMN status SET DEFAULT 'verified'::verification_status;