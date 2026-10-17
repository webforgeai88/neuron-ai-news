revoke insert,update,delete on public.neuron_posts from anon,authenticated;
create policy neuron_backend_only on public.neuron_auth_sessions as restrictive for all to anon,authenticated using (false) with check (false);
create policy neuron_backend_only on public.neuron_demo_sessions as restrictive for all to anon,authenticated using (false) with check (false);
create policy neuron_backend_only on public.neuron_demo_staff as restrictive for all to anon,authenticated using (false) with check (false);
create policy neuron_backend_only on public.neuron_profiles as restrictive for all to anon,authenticated using (false) with check (false);
create policy neuron_backend_only on public.neuron_rate_limits as restrictive for all to anon,authenticated using (false) with check (false);
create policy neuron_backend_only on public.neuron_settings as restrictive for all to anon,authenticated using (false) with check (false);
