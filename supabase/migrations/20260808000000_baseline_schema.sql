-- =============================================================================
-- HESTIA — SCHEMA BASELINE (squashed)
--
-- Single source of truth snapshot of the dev database (nkawubpnwkhzvwqkxhaz).
-- Generated 2026-08-08 from 'supabase db dump --schema public' + storage/
-- realtime/auth.state captured from the live database.
--
-- Replaces the previous 56 migration files (which were not replayable from
-- scratch due to out-of-order multi-tenant backfills). History for those is
-- recorded as 'applied'; this file is the baseline for any fresh project.
-- =============================================================================




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."_hestia_snippet"("txt" "text", "max_len" integer DEFAULT 80) RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  SELECT
    CASE
      WHEN txt IS NULL THEN ''
      WHEN length(btrim(regexp_replace(txt, '\s+', ' ', 'g'))) <= max_len
        THEN btrim(regexp_replace(txt, '\s+', ' ', 'g'))
      ELSE left(btrim(regexp_replace(txt, '\s+', ' ', 'g')), GREATEST(max_len - 1, 0)) || '…'
    END;
$$;


ALTER FUNCTION "public"."_hestia_snippet"("txt" "text", "max_len" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_log_room_activity"("room_id" "uuid", "action" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  resolved_hotel_id uuid;
BEGIN
  IF room_id IS NULL OR action IS NULL OR btrim(action) = '' THEN
    RETURN;
  END IF;

  -- Prefer room's hotel_id, fallback to Default Hotel.
  SELECT r.hotel_id INTO resolved_hotel_id
  FROM public.rooms r
  WHERE r.id = room_id;

  IF resolved_hotel_id IS NULL THEN
    SELECT h.id INTO resolved_hotel_id
    FROM public.hotels h
    WHERE h.name = 'Default Hotel'
    LIMIT 1;
  END IF;

  INSERT INTO public.activity_logs (user_id, action, table_name, record_id, created_at, hotel_id)
  VALUES (auth.uid(), action, 'rooms', room_id, now(), resolved_hotel_id);
END;
$$;


ALTER FUNCTION "public"."_log_room_activity"("room_id" "uuid", "action" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_room_assignments_activity_logs_trg"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  rid uuid;
  action text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    rid := NEW.room_id;
    action := 'Assigned the room';
    PERFORM public._log_room_activity(rid, action);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    rid := COALESCE(NEW.room_id, OLD.room_id);
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      action := 'Updated room assignment';
    ELSIF NEW.work_status IS DISTINCT FROM OLD.work_status THEN
      action := 'Updated room work status';
    ELSE
      action := 'Updated room assignment';
    END IF;
    PERFORM public._log_room_activity(rid, action);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    rid := OLD.room_id;
    action := 'Removed room assignment';
    PERFORM public._log_room_activity(rid, action);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."_room_assignments_activity_logs_trg"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_room_notes_activity_logs_trg"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  rid uuid;
  action text;
  txt text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    rid := NEW.room_id;
    txt := public._hestia_snippet(NEW.text, 80);
    action := CASE
      WHEN btrim(txt) <> '' THEN 'Added a note: “' || txt || '”'
      ELSE 'Added a note'
    END;
    PERFORM public._log_room_activity(rid, action);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    rid := COALESCE(NEW.room_id, OLD.room_id);
    action := 'Updated a note';
    PERFORM public._log_room_activity(rid, action);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    rid := OLD.room_id;
    action := 'Deleted a note';
    PERFORM public._log_room_activity(rid, action);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."_room_notes_activity_logs_trg"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_rooms_activity_logs_trg"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  rid uuid;
  action text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    rid := NEW.id;
    action := 'Created room';
    PERFORM public._log_room_activity(rid, action);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    rid := NEW.id;
    IF NEW.house_keeping_status IS DISTINCT FROM OLD.house_keeping_status THEN
      action := 'Updated housekeeping status to ' || COALESCE(NEW.house_keeping_status, 'unknown');
    ELSIF NEW.flagged IS DISTINCT FROM OLD.flagged THEN
      action := CASE WHEN NEW.flagged THEN 'Flagged the room' ELSE 'Removed the room flag' END;
    ELSIF NEW.priority IS DISTINCT FROM OLD.priority THEN
      action := CASE WHEN NEW.priority = 'high' THEN 'Marked the room as priority' ELSE 'Removed the priority mark' END;
    ELSIF NEW.return_later_at IS DISTINCT FROM OLD.return_later_at THEN
      action := 'Updated Return Later';
    ELSE
      action := 'Updated room';
    END IF;
    PERFORM public._log_room_activity(rid, action);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    rid := OLD.id;
    action := 'Deleted room';
    PERFORM public._log_room_activity(rid, action);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."_rooms_activity_logs_trg"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_tickets_activity_logs_trg"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  rid uuid;
  ttitle text;
  action text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    rid := NEW.room_id;
    ttitle := COALESCE(NEW.title, '');
    action := CASE
      WHEN btrim(ttitle) <> '' THEN 'Created a ticket: ' || btrim(ttitle)
      ELSE 'Created a ticket'
    END;
    PERFORM public._log_room_activity(rid, action);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    rid := COALESCE(NEW.room_id, OLD.room_id);
    ttitle := COALESCE(NEW.title, OLD.title, '');

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      action := 'Updated ticket status to ' || COALESCE(NEW.status, 'unknown');
    ELSIF NEW.due_at IS DISTINCT FROM OLD.due_at THEN
      action := 'Updated ticket due time';
    ELSIF NEW.assigned_to_id IS DISTINCT FROM OLD.assigned_to_id THEN
      action := 'Updated ticket assignee';
    ELSIF NEW.priority IS DISTINCT FROM OLD.priority THEN
      action := 'Updated ticket priority';
    ELSE
      action := 'Updated a ticket';
    END IF;

    IF btrim(ttitle) <> '' THEN
      action := action || ' (' || btrim(ttitle) || ')';
    END IF;

    PERFORM public._log_room_activity(rid, action);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    rid := OLD.room_id;
    ttitle := COALESCE(OLD.title, '');
    action := CASE
      WHEN btrim(ttitle) <> '' THEN 'Deleted a ticket (' || btrim(ttitle) || ')'
      ELSE 'Deleted a ticket'
    END;
    PERFORM public._log_room_activity(rid, action);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."_tickets_activity_logs_trg"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."am_turndown_to_stayover"() RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  UPDATE reservations
  SET front_office_status = 'Stayover'
  WHERE front_office_status = 'Turndown'
    AND reservation_status = 'Occupied';
$$;


ALTER FUNCTION "public"."am_turndown_to_stayover"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_hotel_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT u.hotel_id
  FROM public.users u
  WHERE u.id = auth.uid()
$$;


ALTER FUNCTION "public"."auth_hotel_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_user_chat_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT chat_id FROM public.chat_participants WHERE user_id = auth.uid();
$$;


ALTER FUNCTION "public"."auth_user_chat_ids"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auth_user_chat_ids"() IS 'Returns chat_ids where current user is a participant; used by RLS to avoid self-reference recursion.';



CREATE OR REPLACE FUNCTION "public"."auth_user_is_participant_in_chat"("p_chat_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_id = p_chat_id AND user_id = auth.uid());
$$;


ALTER FUNCTION "public"."auth_user_is_participant_in_chat"("p_chat_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auth_user_is_participant_in_chat"("p_chat_id" "uuid") IS 'True if current user is in chat; used by RLS on chats/messages to avoid recursion.';



CREATE OR REPLACE FUNCTION "public"."ensure_current_user_profile"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  uid uuid;
  resolved_hotel_id uuid;
  meta_hotel_id uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RETURN NULL;
  END IF;

  -- If profile exists, return its hotel_id immediately.
  SELECT u.hotel_id INTO resolved_hotel_id
  FROM public.users u
  WHERE u.id = uid;

  IF resolved_hotel_id IS NOT NULL THEN
    RETURN resolved_hotel_id;
  END IF;

  -- Resolve default hotel (create if needed).
  SELECT h.id INTO resolved_hotel_id
  FROM public.hotels h
  WHERE h.name = 'Default Hotel'
  LIMIT 1;

  IF resolved_hotel_id IS NULL THEN
    INSERT INTO public.hotels (name)
    VALUES ('Default Hotel')
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO resolved_hotel_id;
  END IF;

  -- Optional: honor auth metadata hotel_id only if it exists in public.hotels.
  -- Some environments/users can have stale hotel_id in metadata, which would violate FK.
  SELECT NULLIF((au.raw_user_meta_data->>'hotel_id')::text, '')::uuid
  INTO meta_hotel_id
  FROM auth.users au
  WHERE au.id = uid;

  IF meta_hotel_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.hotels h WHERE h.id = meta_hotel_id) THEN
    meta_hotel_id := NULL;
  END IF;

  -- Create/repair the public.users row using auth metadata when available.
  INSERT INTO public.users (id, full_name, avatar_url, hotel_id)
  SELECT
    au.id,
    COALESCE(
      au.raw_user_meta_data->>'full_name',
      au.email,
      split_part(COALESCE(au.email, 'user'), '@', 1),
      'User'
    ) AS full_name,
    au.raw_user_meta_data->>'avatar_url' AS avatar_url,
    COALESCE(
      meta_hotel_id,
      resolved_hotel_id
    ) AS hotel_id
  FROM auth.users au
  WHERE au.id = uid
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    hotel_id = COALESCE(public.users.hotel_id, EXCLUDED.hotel_id);

  -- Return the (now) present hotel_id.
  SELECT u.hotel_id INTO resolved_hotel_id
  FROM public.users u
  WHERE u.id = uid;

  RETURN resolved_hotel_id;
END;
$$;


ALTER FUNCTION "public"."ensure_current_user_profile"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."rooms" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "room_number" "text" NOT NULL,
    "category" "text",
    "credit" integer DEFAULT 0,
    "linen_status" "text",
    "priority" "text",
    "flagged" boolean DEFAULT false,
    "special_instructions" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "house_keeping_status" "text",
    "return_later_at" timestamp with time zone,
    "paused_at" timestamp with time zone,
    "refuse_service_at" timestamp with time zone,
    "refuse_service_reason" "text",
    "hotel_id" "uuid" NOT NULL
);


ALTER TABLE "public"."rooms" OWNER TO "postgres";


COMMENT ON COLUMN "public"."rooms"."return_later_at" IS 'When housekeeping should return to this room (Return Later).';



COMMENT ON COLUMN "public"."rooms"."paused_at" IS 'When housekeeping paused this room (Pause status).';



COMMENT ON COLUMN "public"."rooms"."refuse_service_at" IS 'When housekeeping refused service for this room.';



COMMENT ON COLUMN "public"."rooms"."refuse_service_reason" IS 'Reason for refusing service (free text).';



CREATE OR REPLACE FUNCTION "public"."get_rooms_without_reservations"() RETURNS SETOF "public"."rooms"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT r.*
  FROM rooms r
  WHERE NOT EXISTS (
    SELECT 1 FROM reservations res WHERE res.room_id = r.id
  )
  ORDER BY r.room_number ASC;
$$;


ALTER FUNCTION "public"."get_rooms_without_reservations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_auth_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  resolved_hotel_id UUID;
BEGIN
  -- Prefer explicit hotel_id passed in auth user metadata
  BEGIN
    resolved_hotel_id := (NEW.raw_user_meta_data->>'hotel_id')::uuid;
  EXCEPTION
    WHEN invalid_text_representation THEN
      resolved_hotel_id := NULL;
  END;

  -- Fallback to Default Hotel (create it if needed)
  IF resolved_hotel_id IS NULL THEN
    SELECT id INTO resolved_hotel_id
    FROM public.hotels
    WHERE name = 'Default Hotel'
    LIMIT 1;

    IF resolved_hotel_id IS NULL THEN
      INSERT INTO public.hotels (name)
      VALUES ('Default Hotel')
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id INTO resolved_hotel_id;
    END IF;
  END IF;

  INSERT INTO public.users (id, full_name, avatar_url, hotel_id)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.email,
      split_part(COALESCE(NEW.email, 'user'), '@', 1),
      'User'
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    resolved_hotel_id
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    hotel_id = COALESCE(public.users.hotel_id, EXCLUDED.hotel_id);

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_auth_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pm_stayover_to_turndown"() RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  UPDATE reservations
  SET front_office_status = 'Turndown'
  WHERE front_office_status = 'Stayover'
    AND reservation_status = 'Occupied';
$$;


ALTER FUNCTION "public"."pm_stayover_to_turndown"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_expo_push_token"("p_expo_push_token" "text", "p_device_os" "text", "p_device_name" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_expo_push_token IS NULL OR length(trim(p_expo_push_token)) < 10 THEN
    RAISE EXCEPTION 'Invalid push token';
  END IF;

  INSERT INTO user_push_tokens (user_id, expo_push_token, device_os, device_name)
  VALUES (auth.uid(), p_expo_push_token, p_device_os, p_device_name)
  ON CONFLICT (expo_push_token) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    device_os = EXCLUDED.device_os,
    device_name = EXCLUDED.device_name,
    updated_at = NOW();
END;
$$;


ALTER FUNCTION "public"."register_expo_push_token"("p_expo_push_token" "text", "p_device_os" "text", "p_device_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_lost_and_found_tracking_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.tracking_number IS NULL OR NEW.tracking_number = '' THEN
    NEW.tracking_number := 'FH' || LPAD(nextval('lost_and_found_tracking_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_lost_and_found_tracking_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."activity_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "hotel_id" "uuid" NOT NULL
);


ALTER TABLE "public"."activity_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_participants" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "chat_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    CONSTRAINT "chat_participants_role_check" CHECK (("role" = ANY (ARRAY['member'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."chat_participants" OWNER TO "postgres";


COMMENT ON COLUMN "public"."chat_participants"."role" IS 'member or admin; only admins can edit group name; only creator can delete group or promote to admin.';



CREATE TABLE IF NOT EXISTS "public"."chats" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "type" "text" NOT NULL,
    "room_id" "uuid",
    "ticket_id" "uuid",
    "created_by_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "name" "text",
    "hotel_id" "uuid" NOT NULL
);


ALTER TABLE "public"."chats" OWNER TO "postgres";


COMMENT ON COLUMN "public"."chats"."name" IS 'Display name for the chat; required for group chats, null for direct/room/ticket chats.';



CREATE TABLE IF NOT EXISTS "public"."consumables" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "category" "text",
    "unit_price" numeric(10,2) DEFAULT 0,
    "billable" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "hotel_id" "uuid" NOT NULL
);


ALTER TABLE "public"."consumables" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consumptions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "reservation_id" "uuid" NOT NULL,
    "room_id" "uuid" NOT NULL,
    "consumable_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price" numeric(10,2),
    "total_amount" numeric(10,2),
    "status" "text" DEFAULT 'pending'::"text",
    "reported_by_id" "uuid" NOT NULL,
    "consumed_at" timestamp with time zone DEFAULT "now"(),
    "remarks" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "hotel_id" "uuid" NOT NULL
);


ALTER TABLE "public"."consumptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."departments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."departments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "full_name" "text" NOT NULL,
    "vip_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "address" "text",
    "company" "text",
    "primary_email" "text",
    "dob" "date",
    "image_url" "text",
    "hotel_id" "uuid" NOT NULL
);


ALTER TABLE "public"."guests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hotels" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."hotels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lost_and_found_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "item_name" "text" NOT NULL,
    "description" "text",
    "room_id" "uuid",
    "reservation_id" "uuid",
    "found_location" "text",
    "found_at" timestamp with time zone DEFAULT "now"(),
    "found_by_id" "uuid" NOT NULL,
    "status" "text",
    "storage_location" "text",
    "return_info" "text",
    "notes" "text",
    "ticket_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tracking_number" "text",
    "image_url" "text",
    "registered_by_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "shipped_location" "text",
    "hotel_id" "uuid" NOT NULL
);


ALTER TABLE "public"."lost_and_found_items" OWNER TO "postgres";


COMMENT ON COLUMN "public"."lost_and_found_items"."shipped_location" IS 'Destination/location where the item was shipped.';



CREATE SEQUENCE IF NOT EXISTS "public"."lost_and_found_tracking_seq"
    START WITH 10000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."lost_and_found_tracking_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "chat_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "type" "text" DEFAULT 'text'::"text" NOT NULL,
    "content" "text",
    "room_assignment_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "reply_to_id" "uuid",
    "tagged_user_id" "uuid",
    "hotel_id" "uuid" NOT NULL
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


COMMENT ON COLUMN "public"."messages"."reply_to_id" IS 'When set, this message is a reply to another message.';



COMMENT ON COLUMN "public"."messages"."tagged_user_id" IS 'When set, this message tags/mentions this user.';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "hotel_id" "uuid" NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reservation_guests" (
    "reservation_id" "uuid" NOT NULL,
    "guest_id" "uuid" NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "guest_order" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "reservation_guests_guest_order_nonnegative" CHECK (("guest_order" >= 0))
);


ALTER TABLE "public"."reservation_guests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reservations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "room_id" "uuid" NOT NULL,
    "arrival_date" "date" NOT NULL,
    "departure_date" "date" NOT NULL,
    "eta" time without time zone,
    "adults" integer DEFAULT 0,
    "kids" integer DEFAULT 0,
    "reservation_status" "text",
    "front_office_status" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "promised_time" time without time zone,
    "hotel_id" "uuid" NOT NULL
);


ALTER TABLE "public"."reservations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "role_id" "uuid" NOT NULL,
    "permission_id" "uuid" NOT NULL
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."room_assignments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "room_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "shift_id" "uuid" NOT NULL,
    "work_status" "text",
    "pause_reason" "text",
    "refuse_reason" "text",
    "start_time" timestamp with time zone,
    "end_time" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "hotel_id" "uuid" NOT NULL
);


ALTER TABLE "public"."room_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."room_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "room_id" "uuid" NOT NULL,
    "reservation_id" "uuid",
    "user_id" "uuid",
    "guest_id" "uuid",
    "event_type" "text" NOT NULL,
    "event_id" "uuid",
    "description" "text",
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "hotel_id" "uuid" NOT NULL
);


ALTER TABLE "public"."room_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."room_notes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "room_id" "uuid" NOT NULL,
    "created_by_id" "uuid",
    "text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "hotel_id" "uuid" NOT NULL
);


ALTER TABLE "public"."room_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shifts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "hotel_id" "uuid" NOT NULL
);


ALTER TABLE "public"."shifts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "tagged_user_id" "uuid" NOT NULL,
    "tagged_by_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "hotel_id" "uuid" NOT NULL
);


ALTER TABLE "public"."ticket_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tickets" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "type" "text",
    "priority" "text",
    "status" "text" NOT NULL,
    "room_id" "uuid",
    "room_assignment_id" "uuid",
    "created_by_id" "uuid" NOT NULL,
    "assigned_to_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "resolved_at" timestamp with time zone,
    "department_id" "uuid",
    "due_at" timestamp with time zone,
    "hotel_id" "uuid" NOT NULL
);


ALTER TABLE "public"."tickets" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tickets"."department_id" IS 'Department the ticket is assigned to; staff tagging is limited to this department.';



COMMENT ON COLUMN "public"."tickets"."due_at" IS 'When the ticket should be completed (optional).';



CREATE TABLE IF NOT EXISTS "public"."user_push_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "expo_push_token" "text" NOT NULL,
    "device_os" "text",
    "device_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "hotel_id" "uuid" NOT NULL
);


ALTER TABLE "public"."user_push_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "avatar_url" "text",
    "department_id" "uuid",
    "role_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "hotel_id" "uuid" NOT NULL
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_participants"
    ADD CONSTRAINT "chat_participants_chat_id_user_id_key" UNIQUE ("chat_id", "user_id");



ALTER TABLE ONLY "public"."chat_participants"
    ADD CONSTRAINT "chat_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chats"
    ADD CONSTRAINT "chats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consumables"
    ADD CONSTRAINT "consumables_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consumptions"
    ADD CONSTRAINT "consumptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guests"
    ADD CONSTRAINT "guests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hotels"
    ADD CONSTRAINT "hotels_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."hotels"
    ADD CONSTRAINT "hotels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lost_and_found_items"
    ADD CONSTRAINT "lost_and_found_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservation_guests"
    ADD CONSTRAINT "reservation_guests_pkey" PRIMARY KEY ("reservation_id", "guest_id");



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id", "permission_id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."room_assignments"
    ADD CONSTRAINT "room_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."room_history"
    ADD CONSTRAINT "room_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."room_notes"
    ADD CONSTRAINT "room_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_tags"
    ADD CONSTRAINT "ticket_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_tags"
    ADD CONSTRAINT "ticket_tags_ticket_id_tagged_user_id_key" UNIQUE ("ticket_id", "tagged_user_id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_push_tokens"
    ADD CONSTRAINT "user_push_tokens_expo_push_token_key" UNIQUE ("expo_push_token");



ALTER TABLE ONLY "public"."user_push_tokens"
    ADD CONSTRAINT "user_push_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_activity_logs_hotel_id" ON "public"."activity_logs" USING "btree" ("hotel_id");



CREATE INDEX "idx_activity_logs_table_record_created" ON "public"."activity_logs" USING "btree" ("table_name", "record_id", "created_at" DESC);



CREATE INDEX "idx_chat_participants_chat" ON "public"."chat_participants" USING "btree" ("chat_id");



CREATE INDEX "idx_chat_participants_hotel_id" ON "public"."chat_participants" USING "btree" ("hotel_id");



CREATE INDEX "idx_chats_hotel_id" ON "public"."chats" USING "btree" ("hotel_id");



CREATE INDEX "idx_consumables_hotel_id" ON "public"."consumables" USING "btree" ("hotel_id");



CREATE INDEX "idx_consumptions_hotel_id" ON "public"."consumptions" USING "btree" ("hotel_id");



CREATE INDEX "idx_consumptions_reservation" ON "public"."consumptions" USING "btree" ("reservation_id");



CREATE INDEX "idx_consumptions_room" ON "public"."consumptions" USING "btree" ("room_id");



CREATE INDEX "idx_guests_hotel_id" ON "public"."guests" USING "btree" ("hotel_id");



CREATE UNIQUE INDEX "idx_guests_hotel_id_full_name_unique" ON "public"."guests" USING "btree" ("hotel_id", "full_name");



CREATE UNIQUE INDEX "idx_hotels_name_unique" ON "public"."hotels" USING "btree" ("name");



CREATE INDEX "idx_lost_and_found_items_hotel_id" ON "public"."lost_and_found_items" USING "btree" ("hotel_id");



CREATE INDEX "idx_lost_and_found_items_registered_by_id" ON "public"."lost_and_found_items" USING "btree" ("registered_by_id");



CREATE INDEX "idx_lost_and_found_room" ON "public"."lost_and_found_items" USING "btree" ("room_id");



CREATE UNIQUE INDEX "idx_lost_and_found_tracking_number" ON "public"."lost_and_found_items" USING "btree" ("tracking_number") WHERE ("tracking_number" IS NOT NULL);



CREATE INDEX "idx_messages_chat" ON "public"."messages" USING "btree" ("chat_id");



CREATE INDEX "idx_messages_hotel_id" ON "public"."messages" USING "btree" ("hotel_id");



CREATE INDEX "idx_messages_reply_to" ON "public"."messages" USING "btree" ("reply_to_id");



CREATE INDEX "idx_notifications_hotel_id" ON "public"."notifications" USING "btree" ("hotel_id");



CREATE INDEX "idx_notifications_user_created" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_notifications_user_unread" ON "public"."notifications" USING "btree" ("user_id") WHERE ("read_at" IS NULL);



CREATE INDEX "idx_reservation_guests_hotel_id" ON "public"."reservation_guests" USING "btree" ("hotel_id");



CREATE UNIQUE INDEX "idx_reservation_guests_hotel_res_guest_unique" ON "public"."reservation_guests" USING "btree" ("hotel_id", "reservation_id", "guest_id");



CREATE INDEX "idx_reservation_guests_reservation_guest_order" ON "public"."reservation_guests" USING "btree" ("reservation_id", "guest_order");



CREATE INDEX "idx_reservations_dates" ON "public"."reservations" USING "btree" ("arrival_date", "departure_date");



CREATE INDEX "idx_reservations_hotel_id" ON "public"."reservations" USING "btree" ("hotel_id");



CREATE INDEX "idx_reservations_room" ON "public"."reservations" USING "btree" ("room_id");



CREATE INDEX "idx_room_assignments_hotel_id" ON "public"."room_assignments" USING "btree" ("hotel_id");



CREATE INDEX "idx_room_assignments_room" ON "public"."room_assignments" USING "btree" ("room_id");



CREATE UNIQUE INDEX "idx_room_assignments_room_shift" ON "public"."room_assignments" USING "btree" ("room_id", "shift_id");



CREATE INDEX "idx_room_assignments_shift" ON "public"."room_assignments" USING "btree" ("shift_id");



CREATE INDEX "idx_room_assignments_user" ON "public"."room_assignments" USING "btree" ("user_id");



CREATE INDEX "idx_room_history_created" ON "public"."room_history" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_room_history_hotel_id" ON "public"."room_history" USING "btree" ("hotel_id");



CREATE INDEX "idx_room_history_room" ON "public"."room_history" USING "btree" ("room_id");



CREATE INDEX "idx_room_notes_created_at" ON "public"."room_notes" USING "btree" ("room_id", "created_at" DESC);



CREATE INDEX "idx_room_notes_hotel_id" ON "public"."room_notes" USING "btree" ("hotel_id");



CREATE INDEX "idx_room_notes_room_id" ON "public"."room_notes" USING "btree" ("room_id");



CREATE INDEX "idx_rooms_flagged" ON "public"."rooms" USING "btree" ("flagged");



CREATE INDEX "idx_rooms_hotel_id" ON "public"."rooms" USING "btree" ("hotel_id");



CREATE UNIQUE INDEX "idx_rooms_hotel_id_room_number_unique" ON "public"."rooms" USING "btree" ("hotel_id", "room_number");



CREATE INDEX "idx_rooms_house_keeping_status" ON "public"."rooms" USING "btree" ("house_keeping_status");



CREATE INDEX "idx_rooms_room_number" ON "public"."rooms" USING "btree" ("room_number");



CREATE INDEX "idx_shifts_hotel_id" ON "public"."shifts" USING "btree" ("hotel_id");



CREATE INDEX "idx_ticket_tags_hotel_id" ON "public"."ticket_tags" USING "btree" ("hotel_id");



CREATE INDEX "idx_ticket_tags_tagged_user" ON "public"."ticket_tags" USING "btree" ("tagged_user_id");



CREATE INDEX "idx_ticket_tags_ticket" ON "public"."ticket_tags" USING "btree" ("ticket_id");



CREATE INDEX "idx_tickets_hotel_id" ON "public"."tickets" USING "btree" ("hotel_id");



CREATE INDEX "idx_tickets_room" ON "public"."tickets" USING "btree" ("room_id");



CREATE INDEX "idx_tickets_status" ON "public"."tickets" USING "btree" ("status");



CREATE INDEX "idx_user_push_tokens_hotel_id" ON "public"."user_push_tokens" USING "btree" ("hotel_id");



CREATE INDEX "idx_user_push_tokens_user_id" ON "public"."user_push_tokens" USING "btree" ("user_id");



CREATE INDEX "idx_users_department" ON "public"."users" USING "btree" ("department_id");



CREATE INDEX "idx_users_hotel_id" ON "public"."users" USING "btree" ("hotel_id");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role_id");



CREATE UNIQUE INDEX "ux_reservation_guests_reservation_guest_order" ON "public"."reservation_guests" USING "btree" ("reservation_id", "guest_order");



CREATE OR REPLACE TRIGGER "room_assignments_activity_logs_trg" AFTER INSERT OR DELETE OR UPDATE ON "public"."room_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."_room_assignments_activity_logs_trg"();



CREATE OR REPLACE TRIGGER "room_notes_activity_logs_trg" AFTER INSERT OR DELETE OR UPDATE ON "public"."room_notes" FOR EACH ROW EXECUTE FUNCTION "public"."_room_notes_activity_logs_trg"();



CREATE OR REPLACE TRIGGER "rooms_activity_logs_trg" AFTER INSERT OR DELETE OR UPDATE ON "public"."rooms" FOR EACH ROW EXECUTE FUNCTION "public"."_rooms_activity_logs_trg"();



CREATE OR REPLACE TRIGGER "set_lost_and_found_tracking_number_trigger" BEFORE INSERT ON "public"."lost_and_found_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_lost_and_found_tracking_number"();



CREATE OR REPLACE TRIGGER "tickets_activity_logs_trg" AFTER INSERT OR DELETE OR UPDATE ON "public"."tickets" FOR EACH ROW EXECUTE FUNCTION "public"."_tickets_activity_logs_trg"();



CREATE OR REPLACE TRIGGER "update_consumables_updated_at" BEFORE UPDATE ON "public"."consumables" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_departments_updated_at" BEFORE UPDATE ON "public"."departments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_hotels_updated_at" BEFORE UPDATE ON "public"."hotels" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_lost_and_found_updated_at" BEFORE UPDATE ON "public"."lost_and_found_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_reservations_updated_at" BEFORE UPDATE ON "public"."reservations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_roles_updated_at" BEFORE UPDATE ON "public"."roles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_room_assignments_updated_at" BEFORE UPDATE ON "public"."room_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_rooms_updated_at" BEFORE UPDATE ON "public"."rooms" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tickets_updated_at" BEFORE UPDATE ON "public"."tickets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_push_tokens_updated_at" BEFORE UPDATE ON "public"."user_push_tokens" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chat_participants"
    ADD CONSTRAINT "chat_participants_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_participants"
    ADD CONSTRAINT "chat_participants_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."chat_participants"
    ADD CONSTRAINT "chat_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chats"
    ADD CONSTRAINT "chats_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chats"
    ADD CONSTRAINT "chats_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."chats"
    ADD CONSTRAINT "chats_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chats"
    ADD CONSTRAINT "chats_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."consumables"
    ADD CONSTRAINT "consumables_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."consumptions"
    ADD CONSTRAINT "consumptions_consumable_id_fkey" FOREIGN KEY ("consumable_id") REFERENCES "public"."consumables"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consumptions"
    ADD CONSTRAINT "consumptions_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."consumptions"
    ADD CONSTRAINT "consumptions_reported_by_id_fkey" FOREIGN KEY ("reported_by_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consumptions"
    ADD CONSTRAINT "consumptions_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consumptions"
    ADD CONSTRAINT "consumptions_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guests"
    ADD CONSTRAINT "guests_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."lost_and_found_items"
    ADD CONSTRAINT "lost_and_found_items_found_by_id_fkey" FOREIGN KEY ("found_by_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lost_and_found_items"
    ADD CONSTRAINT "lost_and_found_items_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."lost_and_found_items"
    ADD CONSTRAINT "lost_and_found_items_registered_by_id_fkey" FOREIGN KEY ("registered_by_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lost_and_found_items"
    ADD CONSTRAINT "lost_and_found_items_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lost_and_found_items"
    ADD CONSTRAINT "lost_and_found_items_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lost_and_found_items"
    ADD CONSTRAINT "lost_and_found_items_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "public"."messages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_room_assignment_id_fkey" FOREIGN KEY ("room_assignment_id") REFERENCES "public"."room_assignments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_tagged_user_id_fkey" FOREIGN KEY ("tagged_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservation_guests"
    ADD CONSTRAINT "reservation_guests_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservation_guests"
    ADD CONSTRAINT "reservation_guests_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."reservation_guests"
    ADD CONSTRAINT "reservation_guests_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."room_assignments"
    ADD CONSTRAINT "room_assignments_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."room_assignments"
    ADD CONSTRAINT "room_assignments_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."room_assignments"
    ADD CONSTRAINT "room_assignments_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."room_assignments"
    ADD CONSTRAINT "room_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."room_history"
    ADD CONSTRAINT "room_history_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."room_history"
    ADD CONSTRAINT "room_history_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."room_history"
    ADD CONSTRAINT "room_history_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."room_history"
    ADD CONSTRAINT "room_history_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."room_history"
    ADD CONSTRAINT "room_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."room_notes"
    ADD CONSTRAINT "room_notes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."room_notes"
    ADD CONSTRAINT "room_notes_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."room_notes"
    ADD CONSTRAINT "room_notes_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ticket_tags"
    ADD CONSTRAINT "ticket_tags_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ticket_tags"
    ADD CONSTRAINT "ticket_tags_tagged_by_id_fkey" FOREIGN KEY ("tagged_by_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ticket_tags"
    ADD CONSTRAINT "ticket_tags_tagged_user_id_fkey" FOREIGN KEY ("tagged_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_tags"
    ADD CONSTRAINT "ticket_tags_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_room_assignment_id_fkey" FOREIGN KEY ("room_assignment_id") REFERENCES "public"."room_assignments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_push_tokens"
    ADD CONSTRAINT "user_push_tokens_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."user_push_tokens"
    ADD CONSTRAINT "user_push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE SET NULL;



CREATE POLICY "Authenticated users can create chats" ON "public"."chats" FOR INSERT TO "authenticated" WITH CHECK (("created_by_id" = "auth"."uid"()));



CREATE POLICY "Authenticated users can read departments" ON "public"."departments" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can read permissions" ON "public"."permissions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can read role_permissions" ON "public"."role_permissions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can read roles" ON "public"."roles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Hotel users can delete own room_notes" ON "public"."room_notes" FOR DELETE TO "authenticated" USING ((("hotel_id" = "public"."auth_hotel_id"()) AND ("auth"."uid"() = "created_by_id")));



CREATE POLICY "Hotel users can insert activity_logs" ON "public"."activity_logs" FOR INSERT TO "authenticated" WITH CHECK (("hotel_id" = "public"."auth_hotel_id"()));



CREATE POLICY "Hotel users can insert room_history" ON "public"."room_history" FOR INSERT TO "authenticated" WITH CHECK (("hotel_id" = "public"."auth_hotel_id"()));



CREATE POLICY "Hotel users can insert room_notes" ON "public"."room_notes" FOR INSERT TO "authenticated" WITH CHECK ((("hotel_id" = "public"."auth_hotel_id"()) AND (("auth"."uid"() = "created_by_id") OR ("created_by_id" IS NULL))));



CREATE POLICY "Hotel users can manage chats" ON "public"."chats" TO "authenticated" USING (("hotel_id" = "public"."auth_hotel_id"())) WITH CHECK (("hotel_id" = "public"."auth_hotel_id"()));



CREATE POLICY "Hotel users can manage consumptions" ON "public"."consumptions" TO "authenticated" USING (("hotel_id" = "public"."auth_hotel_id"())) WITH CHECK (("hotel_id" = "public"."auth_hotel_id"()));



CREATE POLICY "Hotel users can manage guests" ON "public"."guests" TO "authenticated" USING (("hotel_id" = "public"."auth_hotel_id"())) WITH CHECK (("hotel_id" = "public"."auth_hotel_id"()));



CREATE POLICY "Hotel users can manage lost_and_found" ON "public"."lost_and_found_items" TO "authenticated" USING (("hotel_id" = "public"."auth_hotel_id"())) WITH CHECK (("hotel_id" = "public"."auth_hotel_id"()));



CREATE POLICY "Hotel users can manage messages" ON "public"."messages" TO "authenticated" USING (("hotel_id" = "public"."auth_hotel_id"())) WITH CHECK (("hotel_id" = "public"."auth_hotel_id"()));



CREATE POLICY "Hotel users can manage reservation_guests" ON "public"."reservation_guests" TO "authenticated" USING (("hotel_id" = "public"."auth_hotel_id"())) WITH CHECK (("hotel_id" = "public"."auth_hotel_id"()));



CREATE POLICY "Hotel users can manage reservations" ON "public"."reservations" TO "authenticated" USING (("hotel_id" = "public"."auth_hotel_id"())) WITH CHECK (("hotel_id" = "public"."auth_hotel_id"()));



CREATE POLICY "Hotel users can manage room_assignments" ON "public"."room_assignments" TO "authenticated" USING (("hotel_id" = "public"."auth_hotel_id"())) WITH CHECK (("hotel_id" = "public"."auth_hotel_id"()));



CREATE POLICY "Hotel users can manage rooms" ON "public"."rooms" TO "authenticated" USING (("hotel_id" = "public"."auth_hotel_id"())) WITH CHECK (("hotel_id" = "public"."auth_hotel_id"()));



CREATE POLICY "Hotel users can manage tickets" ON "public"."tickets" TO "authenticated" USING (("hotel_id" = "public"."auth_hotel_id"())) WITH CHECK (("hotel_id" = "public"."auth_hotel_id"()));



CREATE POLICY "Hotel users can read activity_logs" ON "public"."activity_logs" FOR SELECT TO "authenticated" USING (("hotel_id" = "public"."auth_hotel_id"()));



CREATE POLICY "Hotel users can read consumables" ON "public"."consumables" FOR SELECT TO "authenticated" USING (("hotel_id" = "public"."auth_hotel_id"()));



CREATE POLICY "Hotel users can read room_history" ON "public"."room_history" FOR SELECT TO "authenticated" USING (("hotel_id" = "public"."auth_hotel_id"()));



CREATE POLICY "Hotel users can read room_notes" ON "public"."room_notes" FOR SELECT TO "authenticated" USING (("hotel_id" = "public"."auth_hotel_id"()));



CREATE POLICY "Hotel users can read shifts" ON "public"."shifts" FOR SELECT TO "authenticated" USING (("hotel_id" = "public"."auth_hotel_id"()));



CREATE POLICY "Hotel users can read ticket tags" ON "public"."ticket_tags" FOR SELECT TO "authenticated" USING (("hotel_id" = "public"."auth_hotel_id"()));



CREATE POLICY "Hotel users can tag staff on tickets" ON "public"."ticket_tags" FOR INSERT TO "authenticated" WITH CHECK ((("hotel_id" = "public"."auth_hotel_id"()) AND ("tagged_by_id" = "auth"."uid"())));



CREATE POLICY "Hotel users can update own room_notes" ON "public"."room_notes" FOR UPDATE TO "authenticated" USING ((("hotel_id" = "public"."auth_hotel_id"()) AND ("auth"."uid"() = "created_by_id"))) WITH CHECK ((("hotel_id" = "public"."auth_hotel_id"()) AND ("auth"."uid"() = "created_by_id")));



CREATE POLICY "Participants can delete chat" ON "public"."chats" FOR DELETE TO "authenticated" USING ("public"."auth_user_is_participant_in_chat"("id"));



CREATE POLICY "Participants can delete own messages" ON "public"."messages" FOR DELETE TO "authenticated" USING ((("sender_id" = "auth"."uid"()) AND "public"."auth_user_is_participant_in_chat"("chat_id")));



CREATE POLICY "Participants can insert messages" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK ((("sender_id" = "auth"."uid"()) AND "public"."auth_user_is_participant_in_chat"("chat_id")));



CREATE POLICY "Participants can update chat" ON "public"."chats" FOR UPDATE TO "authenticated" USING ("public"."auth_user_is_participant_in_chat"("id")) WITH CHECK ("public"."auth_user_is_participant_in_chat"("id"));



CREATE POLICY "Participants can update own messages" ON "public"."messages" FOR UPDATE TO "authenticated" USING ((("sender_id" = "auth"."uid"()) AND "public"."auth_user_is_participant_in_chat"("chat_id"))) WITH CHECK ((("sender_id" = "auth"."uid"()) AND "public"."auth_user_is_participant_in_chat"("chat_id")));



CREATE POLICY "Participants can view messages" ON "public"."messages" FOR SELECT TO "authenticated" USING ("public"."auth_user_is_participant_in_chat"("chat_id"));



CREATE POLICY "Tenant isolation for chat_participants" ON "public"."chat_participants" AS RESTRICTIVE TO "authenticated" USING (("hotel_id" = "public"."auth_hotel_id"())) WITH CHECK (("hotel_id" = "public"."auth_hotel_id"()));



CREATE POLICY "Tenant isolation for chats" ON "public"."chats" AS RESTRICTIVE TO "authenticated" USING (("hotel_id" = "public"."auth_hotel_id"())) WITH CHECK (("hotel_id" = "public"."auth_hotel_id"()));



CREATE POLICY "Tenant isolation for messages" ON "public"."messages" AS RESTRICTIVE TO "authenticated" USING (("hotel_id" = "public"."auth_hotel_id"())) WITH CHECK (("hotel_id" = "public"."auth_hotel_id"()));



CREATE POLICY "Users can add self or add others when in chat" ON "public"."chat_participants" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."auth_user_is_participant_in_chat"("chat_id")));



COMMENT ON POLICY "Users can add self or add others when in chat" ON "public"."chat_participants" IS 'WhatsApp-style: add yourself when creating/joining; add others only if you are already a participant (e.g. group admin).';



CREATE POLICY "Users can delete own participant row" ON "public"."chat_participants" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their push tokens" ON "public"."user_push_tokens" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can mark their notifications read" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can read their notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can read their push tokens" ON "public"."user_push_tokens" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can read users in same hotel" ON "public"."users" FOR SELECT TO "authenticated" USING (("hotel_id" = "public"."auth_hotel_id"()));



CREATE POLICY "Users can update own participant row" ON "public"."chat_participants" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own profile" ON "public"."users" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "id") AND ("hotel_id" = "public"."auth_hotel_id"()))) WITH CHECK ((("auth"."uid"() = "id") AND ("hotel_id" = "public"."auth_hotel_id"())));



CREATE POLICY "Users can update their push tokens" ON "public"."user_push_tokens" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can upsert their push tokens" ON "public"."user_push_tokens" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view chats they participate in or created" ON "public"."chats" FOR SELECT TO "authenticated" USING ((("created_by_id" = "auth"."uid"()) OR "public"."auth_user_is_participant_in_chat"("id")));



CREATE POLICY "Users can view participants of their chats" ON "public"."chat_participants" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR ("chat_id" IN ( SELECT "public"."auth_user_chat_ids"() AS "auth_user_chat_ids"))));



ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consumables" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consumptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."departments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hotels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lost_and_found_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reservation_guests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reservations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."role_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."room_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."room_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."room_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rooms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shifts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tickets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_push_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."_hestia_snippet"("txt" "text", "max_len" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."_hestia_snippet"("txt" "text", "max_len" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."_hestia_snippet"("txt" "text", "max_len" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."_log_room_activity"("room_id" "uuid", "action" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."_log_room_activity"("room_id" "uuid", "action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_log_room_activity"("room_id" "uuid", "action" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."_room_assignments_activity_logs_trg"() TO "anon";
GRANT ALL ON FUNCTION "public"."_room_assignments_activity_logs_trg"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_room_assignments_activity_logs_trg"() TO "service_role";



GRANT ALL ON FUNCTION "public"."_room_notes_activity_logs_trg"() TO "anon";
GRANT ALL ON FUNCTION "public"."_room_notes_activity_logs_trg"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_room_notes_activity_logs_trg"() TO "service_role";



GRANT ALL ON FUNCTION "public"."_rooms_activity_logs_trg"() TO "anon";
GRANT ALL ON FUNCTION "public"."_rooms_activity_logs_trg"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_rooms_activity_logs_trg"() TO "service_role";



GRANT ALL ON FUNCTION "public"."_tickets_activity_logs_trg"() TO "anon";
GRANT ALL ON FUNCTION "public"."_tickets_activity_logs_trg"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_tickets_activity_logs_trg"() TO "service_role";



GRANT ALL ON FUNCTION "public"."am_turndown_to_stayover"() TO "anon";
GRANT ALL ON FUNCTION "public"."am_turndown_to_stayover"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."am_turndown_to_stayover"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auth_hotel_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."auth_hotel_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_hotel_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auth_user_chat_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."auth_user_chat_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_user_chat_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auth_user_is_participant_in_chat"("p_chat_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."auth_user_is_participant_in_chat"("p_chat_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_user_is_participant_in_chat"("p_chat_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_current_user_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_current_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_current_user_profile"() TO "service_role";



GRANT ALL ON TABLE "public"."rooms" TO "anon";
GRANT ALL ON TABLE "public"."rooms" TO "authenticated";
GRANT ALL ON TABLE "public"."rooms" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_rooms_without_reservations"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_rooms_without_reservations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_rooms_without_reservations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."pm_stayover_to_turndown"() TO "anon";
GRANT ALL ON FUNCTION "public"."pm_stayover_to_turndown"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."pm_stayover_to_turndown"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."register_expo_push_token"("p_expo_push_token" "text", "p_device_os" "text", "p_device_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."register_expo_push_token"("p_expo_push_token" "text", "p_device_os" "text", "p_device_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."register_expo_push_token"("p_expo_push_token" "text", "p_device_os" "text", "p_device_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_expo_push_token"("p_expo_push_token" "text", "p_device_os" "text", "p_device_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_lost_and_found_tracking_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_lost_and_found_tracking_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_lost_and_found_tracking_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."activity_logs" TO "anon";
GRANT ALL ON TABLE "public"."activity_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_logs" TO "service_role";



GRANT ALL ON TABLE "public"."chat_participants" TO "anon";
GRANT ALL ON TABLE "public"."chat_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_participants" TO "service_role";



GRANT ALL ON TABLE "public"."chats" TO "anon";
GRANT ALL ON TABLE "public"."chats" TO "authenticated";
GRANT ALL ON TABLE "public"."chats" TO "service_role";



GRANT ALL ON TABLE "public"."consumables" TO "anon";
GRANT ALL ON TABLE "public"."consumables" TO "authenticated";
GRANT ALL ON TABLE "public"."consumables" TO "service_role";



GRANT ALL ON TABLE "public"."consumptions" TO "anon";
GRANT ALL ON TABLE "public"."consumptions" TO "authenticated";
GRANT ALL ON TABLE "public"."consumptions" TO "service_role";



GRANT ALL ON TABLE "public"."departments" TO "anon";
GRANT ALL ON TABLE "public"."departments" TO "authenticated";
GRANT ALL ON TABLE "public"."departments" TO "service_role";



GRANT ALL ON TABLE "public"."guests" TO "anon";
GRANT ALL ON TABLE "public"."guests" TO "authenticated";
GRANT ALL ON TABLE "public"."guests" TO "service_role";



GRANT ALL ON TABLE "public"."hotels" TO "anon";
GRANT ALL ON TABLE "public"."hotels" TO "authenticated";
GRANT ALL ON TABLE "public"."hotels" TO "service_role";



GRANT ALL ON TABLE "public"."lost_and_found_items" TO "anon";
GRANT ALL ON TABLE "public"."lost_and_found_items" TO "authenticated";
GRANT ALL ON TABLE "public"."lost_and_found_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."lost_and_found_tracking_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."lost_and_found_tracking_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."lost_and_found_tracking_seq" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."permissions" TO "anon";
GRANT ALL ON TABLE "public"."permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permissions" TO "service_role";



GRANT ALL ON TABLE "public"."reservation_guests" TO "anon";
GRANT ALL ON TABLE "public"."reservation_guests" TO "authenticated";
GRANT ALL ON TABLE "public"."reservation_guests" TO "service_role";



GRANT ALL ON TABLE "public"."reservations" TO "anon";
GRANT ALL ON TABLE "public"."reservations" TO "authenticated";
GRANT ALL ON TABLE "public"."reservations" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."room_assignments" TO "anon";
GRANT ALL ON TABLE "public"."room_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."room_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."room_history" TO "anon";
GRANT ALL ON TABLE "public"."room_history" TO "authenticated";
GRANT ALL ON TABLE "public"."room_history" TO "service_role";



GRANT ALL ON TABLE "public"."room_notes" TO "anon";
GRANT ALL ON TABLE "public"."room_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."room_notes" TO "service_role";



GRANT ALL ON TABLE "public"."shifts" TO "anon";
GRANT ALL ON TABLE "public"."shifts" TO "authenticated";
GRANT ALL ON TABLE "public"."shifts" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_tags" TO "anon";
GRANT ALL ON TABLE "public"."ticket_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_tags" TO "service_role";



GRANT ALL ON TABLE "public"."tickets" TO "anon";
GRANT ALL ON TABLE "public"."tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."tickets" TO "service_role";



GRANT ALL ON TABLE "public"."user_push_tokens" TO "anon";
GRANT ALL ON TABLE "public"."user_push_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."user_push_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";








-- =============================================================================
-- Storage buckets (captured from dev DB on 2026-08-08)
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('chat-attachments', 'chat-attachments', true, NULL, NULL),
  ('guest-images', 'guest-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('lost-and-found', 'lost-and-found', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('ticket-attachments', 'ticket-attachments', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Storage object policies (tenant-prefixed)
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND name LIKE public.auth_hotel_id()::text || '/%');

DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
CREATE POLICY "Authenticated users can update avatars" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND name LIKE public.auth_hotel_id()::text || '/%');

DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload chat attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-attachments' AND name LIKE public.auth_hotel_id()::text || '/%');

DROP POLICY IF EXISTS "Authenticated users can update chat attachments" ON storage.objects;
CREATE POLICY "Authenticated users can update chat attachments" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'chat-attachments' AND name LIKE public.auth_hotel_id()::text || '/%');

DROP POLICY IF EXISTS "Authenticated users can upload guest images" ON storage.objects;
CREATE POLICY "Authenticated users can upload guest images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'guest-images' AND name LIKE public.auth_hotel_id()::text || '/%');

DROP POLICY IF EXISTS "Authenticated users can update guest images" ON storage.objects;
CREATE POLICY "Authenticated users can update guest images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'guest-images' AND name LIKE public.auth_hotel_id()::text || '/%');

DROP POLICY IF EXISTS "Authenticated users can upload lost-and-found images" ON storage.objects;
CREATE POLICY "Authenticated users can upload lost-and-found images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lost-and-found' AND name LIKE public.auth_hotel_id()::text || '/%');

DROP POLICY IF EXISTS "Authenticated users can update lost-and-found images" ON storage.objects;
CREATE POLICY "Authenticated users can update lost-and-found images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'lost-and-found' AND name LIKE public.auth_hotel_id()::text || '/%');

DROP POLICY IF EXISTS "Authenticated users can upload ticket attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload ticket attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ticket-attachments' AND name LIKE public.auth_hotel_id()::text || '/%');

DROP POLICY IF EXISTS "Authenticated users can update ticket attachments" ON storage.objects;
CREATE POLICY "Authenticated users can update ticket attachments" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'ticket-attachments' AND name LIKE public.auth_hotel_id()::text || '/%');

DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
CREATE POLICY "Avatars are publicly readable" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Guest images are publicly readable" ON storage.objects;
CREATE POLICY "Guest images are publicly readable" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'guest-images');

DROP POLICY IF EXISTS "Lost-and-found images are publicly readable" ON storage.objects;
CREATE POLICY "Lost-and-found images are publicly readable" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'lost-and-found');

DROP POLICY IF EXISTS "Ticket attachments are publicly readable" ON storage.objects;
CREATE POLICY "Ticket attachments are publicly readable" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'ticket-attachments');

-- =============================================================================
-- Realtime publication (tables clients subscribe to)
-- =============================================================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- auth.users trigger (creates public.users row on signup)
-- NOTE: handle_new_auth_user() itself is defined in the public schema dump above.
-- =============================================================================

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
