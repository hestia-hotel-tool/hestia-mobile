-- Multi-tenant: add hotel_id to hotel-owned tables and backfill
-- Each row is scoped to a single hotel/property.

DO $$
DECLARE
  default_hotel_id UUID;
BEGIN
  SELECT id INTO default_hotel_id
  FROM public.hotels
  WHERE name = 'Default Hotel'
  LIMIT 1;

  IF default_hotel_id IS NULL THEN
    RAISE EXCEPTION 'Default Hotel not found. Run 20260413090000_hotels_and_user_hotel_id.sql first.';
  END IF;

  -- -------------------------------------------------------------------------
  -- Root tables (no strong foreign-key path): default to Default Hotel
  -- -------------------------------------------------------------------------
  ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS hotel_id UUID;
  UPDATE public.rooms SET hotel_id = default_hotel_id WHERE hotel_id IS NULL;
  CREATE INDEX IF NOT EXISTS idx_rooms_hotel_id ON public.rooms(hotel_id);
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rooms_hotel_id_fkey') THEN
    ALTER TABLE public.rooms
      ADD CONSTRAINT rooms_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE RESTRICT;
  END IF;
  ALTER TABLE public.rooms ALTER COLUMN hotel_id SET NOT NULL;

  ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS hotel_id UUID;
  UPDATE public.shifts SET hotel_id = default_hotel_id WHERE hotel_id IS NULL;
  CREATE INDEX IF NOT EXISTS idx_shifts_hotel_id ON public.shifts(hotel_id);
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shifts_hotel_id_fkey') THEN
    ALTER TABLE public.shifts
      ADD CONSTRAINT shifts_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE RESTRICT;
  END IF;
  ALTER TABLE public.shifts ALTER COLUMN hotel_id SET NOT NULL;

  ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS hotel_id UUID;
  UPDATE public.guests SET hotel_id = default_hotel_id WHERE hotel_id IS NULL;
  CREATE INDEX IF NOT EXISTS idx_guests_hotel_id ON public.guests(hotel_id);
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'guests_hotel_id_fkey') THEN
    ALTER TABLE public.guests
      ADD CONSTRAINT guests_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE RESTRICT;
  END IF;
  ALTER TABLE public.guests ALTER COLUMN hotel_id SET NOT NULL;

  ALTER TABLE public.consumables ADD COLUMN IF NOT EXISTS hotel_id UUID;
  UPDATE public.consumables SET hotel_id = default_hotel_id WHERE hotel_id IS NULL;
  CREATE INDEX IF NOT EXISTS idx_consumables_hotel_id ON public.consumables(hotel_id);
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consumables_hotel_id_fkey') THEN
    ALTER TABLE public.consumables
      ADD CONSTRAINT consumables_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE RESTRICT;
  END IF;
  ALTER TABLE public.consumables ALTER COLUMN hotel_id SET NOT NULL;

  -- -------------------------------------------------------------------------
  -- Reservations + join table
  -- -------------------------------------------------------------------------
  ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS hotel_id UUID;
  UPDATE public.reservations r
  SET hotel_id = rm.hotel_id
  FROM public.rooms rm
  WHERE r.hotel_id IS NULL AND rm.id = r.room_id;
  UPDATE public.reservations SET hotel_id = default_hotel_id WHERE hotel_id IS NULL;
  CREATE INDEX IF NOT EXISTS idx_reservations_hotel_id ON public.reservations(hotel_id);
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservations_hotel_id_fkey') THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE RESTRICT;
  END IF;
  ALTER TABLE public.reservations ALTER COLUMN hotel_id SET NOT NULL;

  ALTER TABLE public.reservation_guests ADD COLUMN IF NOT EXISTS hotel_id UUID;
  UPDATE public.reservation_guests rg
  SET hotel_id = r.hotel_id
  FROM public.reservations r
  WHERE rg.hotel_id IS NULL AND r.id = rg.reservation_id;
  UPDATE public.reservation_guests SET hotel_id = default_hotel_id WHERE hotel_id IS NULL;
  CREATE INDEX IF NOT EXISTS idx_reservation_guests_hotel_id ON public.reservation_guests(hotel_id);
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservation_guests_hotel_id_fkey') THEN
    ALTER TABLE public.reservation_guests
      ADD CONSTRAINT reservation_guests_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE RESTRICT;
  END IF;
  ALTER TABLE public.reservation_guests ALTER COLUMN hotel_id SET NOT NULL;

  -- -------------------------------------------------------------------------
  -- Room assignments
  -- -------------------------------------------------------------------------
  ALTER TABLE public.room_assignments ADD COLUMN IF NOT EXISTS hotel_id UUID;
  UPDATE public.room_assignments ra
  SET hotel_id = COALESCE(rm.hotel_id, u.hotel_id, default_hotel_id)
  FROM public.rooms rm, public.users u
  WHERE ra.hotel_id IS NULL
    AND rm.id = ra.room_id
    AND u.id = ra.user_id;
  UPDATE public.room_assignments SET hotel_id = default_hotel_id WHERE hotel_id IS NULL;
  CREATE INDEX IF NOT EXISTS idx_room_assignments_hotel_id ON public.room_assignments(hotel_id);
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'room_assignments_hotel_id_fkey') THEN
    ALTER TABLE public.room_assignments
      ADD CONSTRAINT room_assignments_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE RESTRICT;
  END IF;
  ALTER TABLE public.room_assignments ALTER COLUMN hotel_id SET NOT NULL;

  -- -------------------------------------------------------------------------
  -- Room notes
  -- -------------------------------------------------------------------------
  ALTER TABLE public.room_notes ADD COLUMN IF NOT EXISTS hotel_id UUID;
  UPDATE public.room_notes rn
  SET hotel_id = rm.hotel_id
  FROM public.rooms rm
  WHERE rn.hotel_id IS NULL AND rm.id = rn.room_id;
  UPDATE public.room_notes SET hotel_id = default_hotel_id WHERE hotel_id IS NULL;
  CREATE INDEX IF NOT EXISTS idx_room_notes_hotel_id ON public.room_notes(hotel_id);
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'room_notes_hotel_id_fkey') THEN
    ALTER TABLE public.room_notes
      ADD CONSTRAINT room_notes_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE RESTRICT;
  END IF;
  ALTER TABLE public.room_notes ALTER COLUMN hotel_id SET NOT NULL;

  -- -------------------------------------------------------------------------
  -- Tickets + tags
  -- -------------------------------------------------------------------------
  IF to_regclass('public.tickets') IS NOT NULL THEN
    ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS hotel_id UUID;
    UPDATE public.tickets t
    SET hotel_id = COALESCE(
      (SELECT rm.hotel_id FROM public.rooms rm WHERE rm.id = t.room_id),
      u.hotel_id,
      default_hotel_id
    )
    FROM public.users u
    WHERE t.hotel_id IS NULL AND u.id = t.created_by_id;
    UPDATE public.tickets SET hotel_id = default_hotel_id WHERE hotel_id IS NULL;
    CREATE INDEX IF NOT EXISTS idx_tickets_hotel_id ON public.tickets(hotel_id);
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_hotel_id_fkey') THEN
      ALTER TABLE public.tickets
        ADD CONSTRAINT tickets_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE RESTRICT;
    END IF;
    ALTER TABLE public.tickets ALTER COLUMN hotel_id SET NOT NULL;
  END IF;

  IF to_regclass('public.ticket_tags') IS NOT NULL THEN
    ALTER TABLE public.ticket_tags ADD COLUMN IF NOT EXISTS hotel_id UUID;
    UPDATE public.ticket_tags tt
    SET hotel_id = t.hotel_id
    FROM public.tickets t
    WHERE tt.hotel_id IS NULL AND t.id = tt.ticket_id;
    UPDATE public.ticket_tags SET hotel_id = default_hotel_id WHERE hotel_id IS NULL;
    CREATE INDEX IF NOT EXISTS idx_ticket_tags_hotel_id ON public.ticket_tags(hotel_id);
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ticket_tags_hotel_id_fkey') THEN
      ALTER TABLE public.ticket_tags
        ADD CONSTRAINT ticket_tags_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE RESTRICT;
    END IF;
    ALTER TABLE public.ticket_tags ALTER COLUMN hotel_id SET NOT NULL;
  END IF;

  -- -------------------------------------------------------------------------
  -- Consumptions
  -- -------------------------------------------------------------------------
  IF to_regclass('public.consumptions') IS NOT NULL THEN
    ALTER TABLE public.consumptions ADD COLUMN IF NOT EXISTS hotel_id UUID;
    UPDATE public.consumptions c
    SET hotel_id = COALESCE(
      (SELECT r.hotel_id FROM public.reservations r WHERE r.id = c.reservation_id),
      (SELECT rm.hotel_id FROM public.rooms rm WHERE rm.id = c.room_id),
      u.hotel_id,
      default_hotel_id
    )
    FROM public.users u
    WHERE c.hotel_id IS NULL AND u.id = c.reported_by_id;
    UPDATE public.consumptions SET hotel_id = default_hotel_id WHERE hotel_id IS NULL;
    CREATE INDEX IF NOT EXISTS idx_consumptions_hotel_id ON public.consumptions(hotel_id);
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consumptions_hotel_id_fkey') THEN
      ALTER TABLE public.consumptions
        ADD CONSTRAINT consumptions_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE RESTRICT;
    END IF;
    ALTER TABLE public.consumptions ALTER COLUMN hotel_id SET NOT NULL;
  END IF;

  -- -------------------------------------------------------------------------
  -- Lost & found
  -- -------------------------------------------------------------------------
  IF to_regclass('public.lost_and_found_items') IS NOT NULL THEN
    ALTER TABLE public.lost_and_found_items ADD COLUMN IF NOT EXISTS hotel_id UUID;
    UPDATE public.lost_and_found_items l
    SET hotel_id = COALESCE(
      (SELECT rm.hotel_id FROM public.rooms rm WHERE rm.id = l.room_id),
      (SELECT r.hotel_id FROM public.reservations r WHERE r.id = l.reservation_id),
      u.hotel_id,
      default_hotel_id
    )
    FROM public.users u
    WHERE l.hotel_id IS NULL AND u.id = l.found_by_id;
    UPDATE public.lost_and_found_items SET hotel_id = default_hotel_id WHERE hotel_id IS NULL;
    CREATE INDEX IF NOT EXISTS idx_lost_and_found_items_hotel_id ON public.lost_and_found_items(hotel_id);
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lost_and_found_items_hotel_id_fkey') THEN
      ALTER TABLE public.lost_and_found_items
        ADD CONSTRAINT lost_and_found_items_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE RESTRICT;
    END IF;
    ALTER TABLE public.lost_and_found_items ALTER COLUMN hotel_id SET NOT NULL;
  END IF;

  -- -------------------------------------------------------------------------
  -- Chats + participants + messages
  -- -------------------------------------------------------------------------
  IF to_regclass('public.chats') IS NOT NULL THEN
    ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS hotel_id UUID;
    UPDATE public.chats c
    SET hotel_id = COALESCE(
      (SELECT rm.hotel_id FROM public.rooms rm WHERE rm.id = c.room_id),
      (CASE
        WHEN to_regclass('public.tickets') IS NOT NULL
          THEN (SELECT t.hotel_id FROM public.tickets t WHERE t.id = c.ticket_id)
        ELSE NULL
      END),
      u.hotel_id,
      default_hotel_id
    )
    FROM public.users u
    WHERE c.hotel_id IS NULL AND u.id = c.created_by_id;
    UPDATE public.chats SET hotel_id = default_hotel_id WHERE hotel_id IS NULL;
    CREATE INDEX IF NOT EXISTS idx_chats_hotel_id ON public.chats(hotel_id);
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chats_hotel_id_fkey') THEN
      ALTER TABLE public.chats
        ADD CONSTRAINT chats_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE RESTRICT;
    END IF;
    ALTER TABLE public.chats ALTER COLUMN hotel_id SET NOT NULL;
  END IF;

  IF to_regclass('public.chat_participants') IS NOT NULL THEN
    ALTER TABLE public.chat_participants ADD COLUMN IF NOT EXISTS hotel_id UUID;
    UPDATE public.chat_participants cp
    SET hotel_id = COALESCE(
      (CASE
        WHEN to_regclass('public.chats') IS NOT NULL
          THEN (SELECT c.hotel_id FROM public.chats c WHERE c.id = cp.chat_id)
        ELSE NULL
      END),
      u.hotel_id,
      default_hotel_id
    )
    FROM public.users u
    WHERE cp.hotel_id IS NULL AND u.id = cp.user_id;
    UPDATE public.chat_participants SET hotel_id = default_hotel_id WHERE hotel_id IS NULL;
    CREATE INDEX IF NOT EXISTS idx_chat_participants_hotel_id ON public.chat_participants(hotel_id);
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_participants_hotel_id_fkey') THEN
      ALTER TABLE public.chat_participants
        ADD CONSTRAINT chat_participants_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE RESTRICT;
    END IF;
    ALTER TABLE public.chat_participants ALTER COLUMN hotel_id SET NOT NULL;
  END IF;

  IF to_regclass('public.messages') IS NOT NULL THEN
    ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS hotel_id UUID;
    UPDATE public.messages m
    SET hotel_id = COALESCE(
      (CASE
        WHEN to_regclass('public.chats') IS NOT NULL
          THEN (SELECT c.hotel_id FROM public.chats c WHERE c.id = m.chat_id)
        ELSE NULL
      END),
      u.hotel_id,
      default_hotel_id
    )
    FROM public.users u
    WHERE m.hotel_id IS NULL AND u.id = m.sender_id;
    UPDATE public.messages SET hotel_id = default_hotel_id WHERE hotel_id IS NULL;
    CREATE INDEX IF NOT EXISTS idx_messages_hotel_id ON public.messages(hotel_id);
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_hotel_id_fkey') THEN
      ALTER TABLE public.messages
        ADD CONSTRAINT messages_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE RESTRICT;
    END IF;
    ALTER TABLE public.messages ALTER COLUMN hotel_id SET NOT NULL;
  END IF;

  -- -------------------------------------------------------------------------
  -- Room history
  -- -------------------------------------------------------------------------
  IF to_regclass('public.room_history') IS NOT NULL THEN
    ALTER TABLE public.room_history ADD COLUMN IF NOT EXISTS hotel_id UUID;
    UPDATE public.room_history rh
    SET hotel_id = COALESCE(
      (SELECT rm.hotel_id FROM public.rooms rm WHERE rm.id = rh.room_id),
      (SELECT r.hotel_id FROM public.reservations r WHERE r.id = rh.reservation_id),
      (SELECT u.hotel_id FROM public.users u WHERE u.id = rh.user_id),
      default_hotel_id
    )
    WHERE rh.hotel_id IS NULL;
    UPDATE public.room_history SET hotel_id = default_hotel_id WHERE hotel_id IS NULL;
    CREATE INDEX IF NOT EXISTS idx_room_history_hotel_id ON public.room_history(hotel_id);
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'room_history_hotel_id_fkey') THEN
      ALTER TABLE public.room_history
        ADD CONSTRAINT room_history_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE RESTRICT;
    END IF;
    ALTER TABLE public.room_history ALTER COLUMN hotel_id SET NOT NULL;
  END IF;

  -- -------------------------------------------------------------------------
  -- Activity logs
  -- -------------------------------------------------------------------------
  IF to_regclass('public.activity_logs') IS NOT NULL THEN
    ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS hotel_id UUID;
    UPDATE public.activity_logs al
    SET hotel_id = COALESCE(u.hotel_id, default_hotel_id)
    FROM public.users u
    WHERE al.hotel_id IS NULL AND u.id = al.user_id;
    UPDATE public.activity_logs SET hotel_id = default_hotel_id WHERE hotel_id IS NULL;
    CREATE INDEX IF NOT EXISTS idx_activity_logs_hotel_id ON public.activity_logs(hotel_id);
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activity_logs_hotel_id_fkey') THEN
      ALTER TABLE public.activity_logs
        ADD CONSTRAINT activity_logs_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE RESTRICT;
    END IF;
    ALTER TABLE public.activity_logs ALTER COLUMN hotel_id SET NOT NULL;
  END IF;
END $$;
