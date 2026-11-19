-- Engineering checklist, Extras — Figma 4759:1432.
--
-- The frame's Extras are the room's own appliances: a Dyson hair dryer and a
-- hand ventilator. The five placeholder extras seeded by 20261118110000
-- (smoke detector, telephone, Wi-Fi, hair dryer, curtains) are switched off,
-- not deleted, so any result already recorded against them keeps its item.

BEGIN;

UPDATE public.inspection_items
   SET active = false
 WHERE department_id = public._department_id('engineering')
   AND category = 'extras'
   AND name IN ('Smoke Detector', 'Telephone', 'Wi-Fi Signal', 'Hair Dryer', 'Curtains and Blinds');

INSERT INTO public.inspection_items (hotel_id, department_id, category, name, image_key, sort_order)
SELECT h.id, public._department_id('engineering'), 'extras', v.name, v.image_key, v.sort_order
  FROM public.hotels h
 CROSS JOIN (VALUES
   ('Dyson Hair Dryer', 'hair-dryer',      1),
   ('Hand Ventilator',  'hand-ventilator', 2)
 ) AS v(name, image_key, sort_order)
ON CONFLICT (hotel_id, department_id, name) DO UPDATE
  SET active = true, category = EXCLUDED.category, image_key = EXCLUDED.image_key, sort_order = EXCLUDED.sort_order;

COMMIT;
