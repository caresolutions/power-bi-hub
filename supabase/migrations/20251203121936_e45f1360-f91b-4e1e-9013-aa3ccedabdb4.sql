-- Allow admins to delete their own power_bi_configs
CREATE POLICY "Users can delete own config"
ON public.power_bi_configs
FOR DELETE
USING ((auth.uid())::text = user_id);