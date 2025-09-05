                                                                           enable_rls                                                                            
-----------------------------------------------------------------------------------------------------------------------------------------------------------------
 ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;
 ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;
 ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;
 ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
 ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.scraping_sources ENABLE ROW LEVEL SECURITY;
 ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;
 ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;
 ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
 ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.scraping_history ENABLE ROW LEVEL SECURITY;
 ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
 ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;
 ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;
 ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;
 ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;
 ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;
 ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;
 ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;
 ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;
 ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.material_prices ENABLE ROW LEVEL SECURITY;
 ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;
 ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.custom_scraping_urls ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.calculation_history ENABLE ROW LEVEL SECURITY;
 CREATE POLICY Admin full access on scraping_sources ON public.scraping_sources FOR ALL TO public USING ((EXISTS ( SELECT 1                                     +
    FROM auth.users                                                                                                                                             +
   WHERE ((users.id = auth.uid()) AND ((users.raw_user_meta_data ->> 'role'::text) = 'admin'::text)))));
 CREATE POLICY Enable admin write access for scraping_sources ON public.scraping_sources FOR ALL TO public USING (true) WITH CHECK (true);
 CREATE POLICY Enable public read access for scraping_sources ON public.scraping_sources FOR SELECT TO public USING (true);
 CREATE POLICY Users can read active scraping_sources ON public.scraping_sources FOR SELECT TO public USING ((is_active = true));
 CREATE POLICY Admin full access on scraping_history ON public.scraping_history FOR ALL TO public USING ((EXISTS ( SELECT 1                                     +
    FROM auth.users                                                                                                                                             +
   WHERE ((users.id = auth.uid()) AND ((users.raw_user_meta_data ->> 'role'::text) = 'admin'::text)))));
 CREATE POLICY Service role can delete scraping_history ON public.scraping_history FOR DELETE TO service_role USING (true);
 CREATE POLICY Service role can insert scraping_history ON public.scraping_history FOR INSERT TO service_role WITH CHECK (true);
 CREATE POLICY Service role can select scraping_history ON public.scraping_history FOR SELECT TO service_role USING (true);
 CREATE POLICY Service role can update scraping_history ON public.scraping_history FOR UPDATE TO service_role USING (true);
 CREATE POLICY Authenticated users can insert material prices ON public.material_prices FOR INSERT TO public WITH CHECK ((auth.role() = 'authenticated'::text));
 CREATE POLICY Authenticated users can update material prices ON public.material_prices FOR UPDATE TO public USING ((auth.role() = 'authenticated'::text));
 CREATE POLICY Users can view material prices ON public.material_prices FOR SELECT TO public USING (true);
 CREATE POLICY Anyone can delete custom scraping URLs ON public.custom_scraping_urls FOR DELETE TO public USING (true);
 CREATE POLICY Anyone can insert custom scraping URLs ON public.custom_scraping_urls FOR INSERT TO public WITH CHECK (true);
 CREATE POLICY Anyone can update custom scraping URLs ON public.custom_scraping_urls FOR UPDATE TO public USING (true);
 CREATE POLICY Anyone can view custom scraping URLs ON public.custom_scraping_urls FOR SELECT TO public USING (true);
 CREATE POLICY Allow all operations for calculation_history ON public.calculation_history FOR ALL TO public USING (true) WITH CHECK (true);
(44 rows)

