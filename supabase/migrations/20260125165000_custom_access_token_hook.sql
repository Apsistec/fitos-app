-- Custom Access Token Hook
-- Adds user role and profile data to JWT claims for better performance
-- This eliminates the need to query the profiles table on every request

-- Create the hook function in the supabase_functions schema (required by Supabase)
create schema if not exists supabase_functions;

-- Grant usage to supabase_auth_admin (required for auth hooks)
grant usage on schema supabase_functions to supabase_auth_admin;

-- Create the custom access token function
create or replace function supabase_functions.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  claims jsonb;
  user_role text;
  user_full_name text;
  user_id uuid;
begin
  -- Get the user ID from the event
  user_id := (event->>'user_id')::uuid;

  -- Fetch user role and name from profiles table
  select role, full_name
  into user_role, user_full_name
  from public.profiles
  where id = user_id;

  -- Get existing claims
  claims := event->'claims';

  -- Add custom claims if profile exists
  if user_role is not null then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  end if;

  if user_full_name is not null then
    claims := jsonb_set(claims, '{user_full_name}', to_jsonb(user_full_name));
  end if;

  -- Update the event with new claims
  event := jsonb_set(event, '{claims}', claims);

  return event;
end;
$$;

-- Grant execute permission to supabase_auth_admin
grant execute on function supabase_functions.custom_access_token_hook(jsonb) to supabase_auth_admin;

-- Revoke execute from public and anon for security
revoke execute on function supabase_functions.custom_access_token_hook(jsonb) from public;
revoke execute on function supabase_functions.custom_access_token_hook(jsonb) from anon;
revoke execute on function supabase_functions.custom_access_token_hook(jsonb) from authenticated;
