-- Create profiles for any users that don't have one
-- This fixes the infinite spinner issue

-- Insert profiles for users that don't have them
INSERT INTO public.profiles (id, full_name, email, phone_number, role)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)) as full_name,
  au.email,
  au.raw_user_meta_data->>'phone_number' as phone_number,
  'parent' as role
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Show what was created
SELECT id, email, full_name, role, created_at 
FROM public.profiles 
ORDER BY created_at DESC
LIMIT 10;
