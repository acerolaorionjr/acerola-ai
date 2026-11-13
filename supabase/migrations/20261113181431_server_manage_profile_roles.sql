CREATE OR REPLACE FUNCTION public.enforce_server_managed_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_request_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  IF v_request_role IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.role := 'user';
    ELSIF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Profile role is managed by the server'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_server_managed_profile_role()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_server_managed_role ON public.profiles;
CREATE TRIGGER profiles_server_managed_role
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_server_managed_profile_role();
