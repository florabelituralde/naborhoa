-- Enable Postgres realtime for tables the app subscribes to.
-- The frontend only uses base44.entities.Notification.subscribe(), so publish
-- the notification table on the default supabase_realtime publication.
alter publication supabase_realtime add table public.notification;
