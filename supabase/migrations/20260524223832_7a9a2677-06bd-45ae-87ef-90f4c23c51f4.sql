-- 1. Drop the policy that depends on the status column
DROP POLICY IF EXISTS "Authenticated users can view verified records in their institut" ON public.index_records;

-- 2. Drop the default that depends on the enum
ALTER TABLE public.index_records ALTER COLUMN status DROP DEFAULT;

-- 3. Change column to text so we can update values freely
ALTER TABLE public.index_records ALTER COLUMN status TYPE text USING status::text;

-- 4. Migrate existing data
UPDATE public.index_records SET status = 'active' WHERE status IN ('verified', 'pending');
UPDATE public.index_records SET status = 'inactive' WHERE status = 'rejected';

-- 5. Drop the old enum type
DROP TYPE IF EXISTS public.verification_status;

-- 6. Create the new enum with desired values
CREATE TYPE public.verification_status AS ENUM ('active', 'inactive', 'expired');

-- 7. Change column type to new enum
ALTER TABLE public.index_records ALTER COLUMN status TYPE public.verification_status USING status::public.verification_status;

-- 8. Set new default
ALTER TABLE public.index_records ALTER COLUMN status SET DEFAULT 'active'::public.verification_status;

-- 9. Recreate the policy with updated condition
CREATE POLICY "Authenticated users can view active records in their institut" 
ON public.index_records 
FOR SELECT 
TO public
USING ((status = 'active'::public.verification_status) AND (institution_id = get_user_institution(auth.uid())));