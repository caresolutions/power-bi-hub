-- Add username and password fields for Master User authentication
ALTER TABLE public.power_bi_configs
ADD COLUMN username TEXT,
ADD COLUMN password TEXT;

-- Add comment explaining the authentication options
COMMENT ON COLUMN public.power_bi_configs.username IS 'Email/username for Master User authentication';
COMMENT ON COLUMN public.power_bi_configs.password IS 'Password for Master User authentication';