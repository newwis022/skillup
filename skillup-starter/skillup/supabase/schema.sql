-- SkillUp Phase 2 database foundation for Supabase/Postgres.
-- Review and test in a NEW Supabase project before using with real people.
-- Never put the service_role key in browser code.

create extension if not exists pgcrypto;

create type public.friendship_status as enum ('pending', 'accepted', 'declined', 'cancelled');
create type public.notification_type as enum ('friend_request', 'friend_accepted', 'like', 'comment', 'message', 'system');
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[A-Za-z0-9_]{3,24}$'),
  display_name text not null default 'SkillUp learner' check (char_length(display_name) between 1 and 60),
  bio text not null default '' check (char_length(bio) <= 300),
  avatar_url text,
  country_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  media_path text,
  media_type text check (media_type is null or media_type in ('image', 'video')),
  visibility text not null default 'public' check (visibility in ('public', 'friends', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_fields_match check ((media_path is null and media_type is null) or (media_path is not null and media_type is not null))
);
create index posts_author_created_idx on public.posts(author_id, created_at desc);
create index posts_created_idx on public.posts(created_at desc);

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status public.friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendship_not_self check (requester_id <> addressee_id),
  constraint friendship_pair_unique unique (requester_id, addressee_id)
);
create index friendships_addressee_status_idx on public.friendships(addressee_id, status);
create index friendships_requester_status_idx on public.friendships(requester_id, status);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index comments_post_created_idx on public.comments(post_id, created_at);

create table public.likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);
create index conversation_members_user_idx on public.conversation_members(user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  constraint message_not_blank check (char_length(trim(body)) > 0)
);
create index messages_conversation_created_idx on public.messages(conversation_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  kind public.notification_type not null,
  entity_id uuid,
  body text not null default '' check (char_length(body) <= 300),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_recipient_created_idx on public.notifications(recipient_id, created_at desc);

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint block_not_self check (blocker_id <> blocked_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete set null,
  post_id uuid references public.posts(id) on delete set null,
  comment_id uuid references public.comments(id) on delete set null,
  reason text not null check (char_length(reason) between 3 and 100),
  details text not null default '' check (char_length(details) <= 1500),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  constraint report_has_target check (reported_user_id is not null or post_id is not null or comment_id is not null)
);

create table public.learning_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_key text not null check (char_length(lesson_key) between 1 and 120),
  completed_at timestamptz not null default now(),
  xp_earned integer not null default 0 check (xp_earned between 0 and 10000),
  primary key (user_id, lesson_key)
);

-- Automatically create a minimal profile after a new auth user is registered.
-- The frontend should collect a username before sign-up or use a generated safe fallback.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate text;
begin
  candidate := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    'learner_' || substr(replace(new.id::text, '-', ''), 1, 12)
  );
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    candidate,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'SkillUp learner')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_friend(user_a uuid, user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = user_a and f.addressee_id = user_b)
        or (f.requester_id = user_b and f.addressee_id = user_a))
  );
$$;

create or replace function public.is_blocked_between(user_a uuid, user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks b
    where (b.blocker_id = user_a and b.blocked_id = user_b)
       or (b.blocker_id = user_b and b.blocked_id = user_a)
  );
$$;

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.friendships enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.learning_progress enable row level security;

-- Profiles: visible to signed-in users unless blocked; users can edit only themselves.
create policy "profiles readable by signed-in users"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or not public.is_blocked_between(id, (select auth.uid()))
);
create policy "users insert own profile"
on public.profiles for insert to authenticated
with check (id = (select auth.uid()));
create policy "users update own profile"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- Public posts can be read by signed-in users; friends-only and private posts are restricted.
create policy "read posts allowed by visibility"
on public.posts for select to authenticated
using (
  not public.is_blocked_between(author_id, (select auth.uid()))
  and (
    visibility = 'public'
    or author_id = (select auth.uid())
    or (visibility = 'friends' and public.is_friend(author_id, (select auth.uid())))
  )
);
create policy "create own posts"
on public.posts for insert to authenticated
with check (author_id = (select auth.uid()));
create policy "update own posts"
on public.posts for update to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()));
create policy "delete own posts"
on public.posts for delete to authenticated
using (author_id = (select auth.uid()));

create policy "read comments on visible posts"
on public.comments for select to authenticated
using (exists (select 1 from public.posts p where p.id = post_id));
create policy "create own comments on visible posts"
on public.comments for insert to authenticated
with check (
  author_id = (select auth.uid())
  and exists (select 1 from public.posts p where p.id = post_id)
);
create policy "delete own comments"
on public.comments for delete to authenticated
using (author_id = (select auth.uid()));

create policy "read likes for visible posts"
on public.likes for select to authenticated
using (exists (select 1 from public.posts p where p.id = post_id));
create policy "like as self"
on public.likes for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.posts p where p.id = post_id)
);
create policy "unlike as self"
on public.likes for delete to authenticated
using (user_id = (select auth.uid()));

-- Friend requests: only participants can read. Only requester can create a pending request.
create policy "read own friendship rows"
on public.friendships for select to authenticated
using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));
create policy "send own friend requests"
on public.friendships for insert to authenticated
with check (
  requester_id = (select auth.uid())
  and status = 'pending'
  and not public.is_blocked_between(requester_id, addressee_id)
);
-- No client UPDATE policy for friendships yet: accepting/declining/cancelling
-- must be implemented via a validated server-side function before this is enabled.
create policy "requester or addressee delete friendship"
on public.friendships for delete to authenticated
using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));

-- Conversations and messages are private to members.
create policy "members read conversations"
on public.conversations for select to authenticated
using (exists (select 1 from public.conversation_members cm where cm.conversation_id = id and cm.user_id = (select auth.uid())));
create policy "members read membership"
on public.conversation_members for select to authenticated
using (user_id = (select auth.uid()) or exists (
  select 1 from public.conversation_members mine
  where mine.conversation_id = conversation_id and mine.user_id = (select auth.uid())
));
-- No client INSERT policy for conversation membership: membership must be created
-- by a validated server-side function that checks accepted friendship and block status.
create policy "update own membership row"
on public.conversation_members for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy "members read messages"
on public.messages for select to authenticated
using (exists (
  select 1 from public.conversation_members cm
  where cm.conversation_id = messages.conversation_id and cm.user_id = (select auth.uid())
));
create policy "members send messages as self"
on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = messages.conversation_id and cm.user_id = (select auth.uid())
  )
);

create policy "read own notifications"
on public.notifications for select to authenticated
using (recipient_id = (select auth.uid()));
create policy "mark own notifications read"
on public.notifications for update to authenticated
using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()));

create policy "read own blocks"
on public.blocks for select to authenticated
using (blocker_id = (select auth.uid()));
create policy "create own blocks"
on public.blocks for insert to authenticated
with check (blocker_id = (select auth.uid()));
create policy "remove own blocks"
on public.blocks for delete to authenticated
using (blocker_id = (select auth.uid()));

create policy "create reports as self"
on public.reports for insert to authenticated
with check (reporter_id = (select auth.uid()));
create policy "reporters read own reports"
on public.reports for select to authenticated
using (reporter_id = (select auth.uid()));
-- Deliberately no client policy to change report status: moderation must be server/admin-only.

create policy "read own learning progress"
on public.learning_progress for select to authenticated
using (user_id = (select auth.uid()));
create policy "write own learning progress"
on public.learning_progress for insert to authenticated
with check (user_id = (select auth.uid()));
create policy "update own learning progress"
on public.learning_progress for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- IMPORTANT hardening notes:
-- 1) Test all RLS policies with two or more separate users before release.
-- 2) Friend request acceptance/decline/cancellation is intentionally disabled until
--    validated server-side functions enforce who may perform each state transition.
-- 3) Conversation creation/member additions are intentionally disabled until a validated
--    RPC checks accepted friendship, blocks, and exactly the intended participants.
-- 4) Add server-side rate limits, spam controls, moderation review, age/privacy controls,
--    and notification triggers before public launch.
-- 5) Create a private Storage bucket and narrowly scoped storage policies before media uploads.
