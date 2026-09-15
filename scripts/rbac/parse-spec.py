#!/usr/bin/env python3
"""Parse the signed-off roles PDF into src/domain/rbac/matrix.json.

    python3 scripts/rbac/parse-spec.py [path/to/spec.pdf]

Requires `pdftotext` (poppler: `brew install poppler`). Run this only when the
spec itself changes — matrix.json is committed, and scripts/generateRbac.js
turns it into permissions.ts and the Supabase seed with no extra dependencies.

This exists so the 54x18 grid is never hand-transcribed.
"""
import re, subprocess, sys, json, collections, pathlib

REPO = pathlib.Path(__file__).resolve().parents[2]
DEFAULT_PDF = REPO / "docs/spec/hestia-roles-2026-01-03.pdf"
PDF = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PDF
OUT = REPO / "src/domain/rbac/matrix.json"

# --- the 18 rights columns, in PDF order -------------------------------------
RIGHTS = [
    "dashboard", "rooms", "chat", "tickets", "lostAndFound", "staff", "settings",
    "reassign", "changeHousekeepingStatus", "notes", "specialInstructions",
    "history", "checklist", "credits", "frontOfficeStatus", "reservationStatus",
    "rush", "flagged",
]

RIGHT_LABELS = {
    "dashboard": "Dashboard", "rooms": "Rooms", "chat": "Chat", "tickets": "Tickets",
    "lostAndFound": "Lost & Found", "staff": "Staff", "settings": "Settings",
    "reassign": "Reassign", "changeHousekeepingStatus": "Change Housekeeping Status",
    "notes": "Notes", "specialInstructions": "Special Instructions",
    "history": "History", "checklist": "Checklist", "credits": "Credits",
    "frontOfficeStatus": "Front Office Status", "reservationStatus": "Reservation Status",
    "rush": "Rush Button", "flagged": "Flagged Button",
}

# --- each PDF right expands to one or more permission keys -------------------
# The PDF is a single YES/NO per right. We split view vs. write so the schema can
# express "may read notes, may not add one" later without a migration. Today both
# halves are granted together whenever the PDF cell is YES.
RIGHT_PERMISSIONS = {
    "dashboard":                ["tab.home.view"],
    "rooms":                    ["tab.rooms.view", "rooms.read"],
    "chat":                     ["tab.chat.view", "chat.create", "chat.groups.manage"],
    "tickets":                  ["tab.tickets.view", "tickets.create", "tickets.update"],
    "lostAndFound":             ["tab.lost_and_found.view", "lost_and_found.read",
                                 "lost_and_found.register"],
    "staff":                    ["tab.staff.view", "staff.read"],
    "settings":                 ["tab.settings.view"],
    "reassign":                 ["rooms.reassign"],
    "changeHousekeepingStatus": ["rooms.status.update"],
    "notes":                    ["rooms.notes.view", "rooms.notes.create"],
    "specialInstructions":      ["rooms.special_instructions.view"],
    "history":                  ["rooms.history.view", "rooms.history.export"],
    "checklist":                ["rooms.checklist.view", "rooms.checklist.complete"],
    "credits":                  ["rooms.credits.view", "rooms.credits.manage"],
    "frontOfficeStatus":        ["rooms.front_office_status.view"],
    "reservationStatus":        ["rooms.reservation_status.view"],
    "rush":                     ["rooms.rush.toggle"],
    "flagged":                  ["rooms.flag.toggle"],
}

# Administrative keys the PDF does not distinguish. Granted only to full_access.
# Kept explicit so the generated seed still verifies 1:1 against the PDF for
# everything else.
ADMIN_ONLY_PERMISSIONS = [
    "staff.manage",
    "settings.manage",
    "tickets.close",
    "lost_and_found.manage",
]

PERMISSION_DESCRIPTIONS = {
    "tab.home.view": "See the Home (Dashboard) tab",
    "tab.rooms.view": "See the Rooms tab",
    "tab.chat.view": "See the Chat tab",
    "tab.tickets.view": "See the Tickets tab",
    "tab.lost_and_found.view": "See the Lost & Found tab",
    "tab.staff.view": "See the Staff tab",
    "tab.settings.view": "See the Settings tab",
    "rooms.read": "Open room lists and room detail",
    "rooms.reassign": "Reassign a room to different staff",
    "rooms.status.update": "Change a room's housekeeping status",
    "rooms.notes.view": "Read room notes",
    "rooms.notes.create": "Add a room note",
    "rooms.special_instructions.view": "Read guest special instructions",
    "rooms.history.view": "Open the room History tab",
    "rooms.history.export": "Download a room history report",
    "rooms.checklist.view": "Open the room Checklist tab",
    "rooms.checklist.complete": "Tick off checklist items",
    "rooms.credits.view": "See room credit values",
    "rooms.credits.manage": "Bill and adjust room credits",
    "rooms.front_office_status.view": "See front-office status on a room",
    "rooms.reservation_status.view": "See reservation status on a room",
    "rooms.rush.toggle": "Mark a room as rush / priority",
    "rooms.flag.toggle": "Flag and unflag a room",
    "chat.create": "Start a direct chat",
    "chat.groups.manage": "Create and administer group chats",
    "tickets.create": "Raise a ticket",
    "tickets.update": "Edit a ticket",
    "tickets.close": "Close a ticket",
    "lost_and_found.read": "Browse lost & found items",
    "lost_and_found.register": "Register a found item",
    "lost_and_found.manage": "Edit and resolve lost & found items",
    "staff.read": "View staff lists and workloads",
    "staff.manage": "Assign rooms to staff and edit staff records",
    "settings.manage": "Change hotel-level settings",
}

# --- departments -------------------------------------------------------------
DEPARTMENTS = [
    ("housekeeping",   "Housekeeping",                 "Room attendants, supervisors and housekeeping leadership"),
    ("front_office",   "Front Office",                 "Reception, night audit and guest relations"),
    ("concierge",      "Concierge",                    "Concierge, bell desk and valet"),
    ("in_room_dining", "In Room Dining",               "Room service and in-suite dining"),
    ("engineering",    "Engineering",                  "Maintenance, repairs and facility operations"),
    ("it",             "IT",                           "Information technology and technical support"),
    ("executive",      "Executive and Administration", "General management and hotel administration"),
    ("food_beverage",  "Food & Beverage / Kitchen",    "Restaurants, bars, banquets and kitchen brigade"),
]

# PDF department header -> our department key.
PDF_DEPT_MAP = {
    "Housekeeping": "housekeeping",
    "Front Office": "front_office",
    "Concierge": "concierge",
    "In Room Dining": "in_room_dining",
    "Engineering": "engineering",
    "IT": "it",
    "Executive and Administration": "executive",
    "Rest of Food and Beverage Department , Kitchen Department": "food_beverage",
}

# Page 2 of the PDF repeats the "Housekeeping" header above the executive block —
# a copy/paste artifact in the source spreadsheet. These three titles belong to
# Executive and Administration.
EXECUTIVE_TITLES = {
    "General Manager", "Hotel Manager", "Assistant to General & Hotel Manager",
}

# Typos in the source spreadsheet, corrected for display.
TITLE_FIXES = {
    "Houskeeping Manager": "Housekeeping Manager",
    "Asssitant Front Office Manager": "Assistant Front Office Manager",
    "Front Office Trainnee": "Front Office Trainee",
    "Housekeeping Portier/Houseman": "Housekeeping Porter / Houseman",
}

# HomeScreen layout variants live on the job title, not the role: they describe
# what a person's day looks like, not what they are allowed to do.
HOME_VARIANTS = {
    "housekeeping_porter_houseman": "hsk_portier",
    "director_of_engineering": "engineering",
    "assistant_director_of_engineering": "engineering",
    "engineering_supervisor": "engineering",
    "shift_engineer": "engineering",
    # In Room Dining reads the same ticket dashboard as engineering, over its
    # own department's tickets — Figma 3859:3355, which is the engineering frame
    # (3843-52) with the header text changed and the rooms search pill kept.
    #
    # The whole department, following engineering: all four titles of the
    # engineering department took that variant while IT, a separate department
    # on the same spec vector, stayed on `default`. These seven share one
    # department and already hold the frame's exact tab set — Home, Tickets,
    # Chat, Rooms, Lost & Found and no Staff — so splitting them by seniority
    # would be arbitrary. The dashboard counts the reader's own assigned
    # tickets, which is as meaningful for an order taker as for the manager the
    # frame happens to name.
    "director_of_in_room_dining": "dining",
    "in_room_dining_manager": "dining",
    "in_room_dining_assistant_manager": "dining",
    "in_room_dining_supervisor": "dining",
    "in_room_dining_waiter_waitress": "dining",
    "in_room_dining_order_taker": "dining",
    "butler_in_room_dining": "dining",
}

# Rooms list layout, same reasoning as HOME_VARIANTS: a presentation concern
# keyed by title, not a right.
#
# Housekeeping leadership and supervisors read the same banded screen; only
# supervisors get the In Progress band pinned to the top, because they work the
# floor from it. Everyone else reads the flat list.
#
# The three leadership titles are listed explicitly even though they were once
# left to the `default` fallback: they were later given the banded screen by
# hand in matrix.json, and omitting them here meant re-running this parser
# silently reverted that.
ROOMS_VARIANTS = {
    "executive_housekeeper": "leadership",
    "housekeeping_manager": "leadership",
    "assistant_housekeeping_manager": "leadership",
    "senior_supervisor": "supervisor",
    "supervisor": "supervisor",
    "coordinator": "supervisor",
    # Attendants get the same banded list, over their own rooms only.
    "housekeeping_room_attendant": "attendant",
    "housekeeping_laundry_attendant": "attendant",
    "housekeeping_public_area_attendant": "attendant",
    # The porter is the exception among the attendant titles: they work the
    # whole floor rather than a room list of their own, so they read every room.
    # That is `leadership` — the same banded screen, minus the assigned-only
    # narrowing and its finished/total pill — and it is what the porter's frame
    # (3859:1041) draws: a copy of the executive housekeeper's screen, cards
    # assigned to other people, no counter beside the title.
    #
    # They keep no Home tab, which is a right (`dashboard`) and independent of
    # this.
    "housekeeping_porter_houseman": "leadership",
    # The whole Front Office department reads the same banded screen as
    # housekeeping leadership — Figma 3859:1919, which is the executive
    # housekeeper's frame (3883:5570) duplicated with the header text changed,
    # down to its duplicated "Paused" heading.
    #
    # All 14 titles in the department, not just the front desk: they share two
    # roles and one department, so splitting them would be arbitrary. Reading
    # the banded list is not the same as being allowed to act on it — none of
    # them holds `rooms.status.update`, and the status pill is gated on that
    # permission in AllRoomsScreen rather than on the variant.
    "director_of_rooms": "leadership",
    "assistant_director_of_rooms": "leadership",
    "director_of_front_office": "leadership",
    "front_office_manager": "leadership",
    "assistant_front_office_manager": "leadership",
    "front_office_supervisor": "leadership",
    "front_office_agent": "leadership",
    "front_office_trainee": "leadership",
    "night_manager": "leadership",
    "night_auditor": "leadership",
    "night_agent": "leadership",
    "guest_relations_manager": "leadership",
    "guest_relations_supervisor": "leadership",
    "guest_relations_agent": "leadership",
}

# Rights we knowingly set differently from the signed-off PDF.
#
# DELIBERATE SPEC DRIFT — do not remove without checking with whoever owns the
# spec. The PDF grants the attendant roles the Dashboard, but the product
# decision is that they work from the Rooms list only and never see Home.
# `dashboard` is the sole source of `tab.home.view`, so clearing it here removes
# the Home tab, the Home landing route and the Home deep link together, and
# nothing else.
#
# `hk_public_area` additionally *gains* `rooms`, which the PDF withholds: the
# same decision gives every attendant a Rooms list narrowed to their own
# assignments, and that title had no Rooms tab at all. This one is a widening
# rather than a narrowing, so it deserves the closest look if the spec is ever
# reconciled.
#
# Applied after the PDF is parsed, so re-running the parser cannot silently
# restore Home.
RIGHT_OVERRIDES = {
    "hk_room_attendant": {"dashboard": False},
    "hk_houseman": {"dashboard": False},
    "hk_laundry": {"dashboard": False},
    "hk_public_area": {"dashboard": False, "rooms": True},
}

# --- role identity, keyed by the set of titles that share a vector -----------
ROLE_BY_MEMBER = [
    ("full_access",       "Full Access",              "Executive Housekeeper"),
    ("hk_room_attendant", "Room Attendant",           "Housekeeping Room Attendant"),
    ("hk_houseman",       "Porter / Houseman",        "Housekeeping Portier/Houseman"),
    ("hk_laundry",        "Laundry Attendant",        "Housekeeping Laundry Attendant"),
    ("hk_public_area",    "Public Area Attendant",    "Housekeeping Public Area Attendant"),
    ("ops_senior",        "Operations Senior",        "Director Of Rooms"),
    ("fo_agent",          "Front Office Agent",       "Front Office Agent"),
    ("concierge_agent",   "Concierge Agent",          "Concierge Agent"),
    ("ird_service",       "In-Room Dining Service",   "In Room Dining Order Taker"),
    ("technical",         "Technical",                "Director of Engineering"),
    ("fnb_kitchen",       "F&B / Kitchen",            "(department-wide)"),
]

ROLE_DESCRIPTIONS = {
    "full_access": "Every right. Housekeeping leadership and hotel executives.",
    "hk_room_attendant": "Cleans rooms: status changes, notes, checklist and history.",
    "hk_houseman": "Support role: rooms, notes and history, no status changes.",
    "hk_laundry": "Linen duties. No chat.",
    "hk_public_area": "Public areas only. No room access.",
    "ops_senior": "Front Office, Concierge and In-Room Dining leadership.",
    "fo_agent": "Front desk agents and trainees.",
    "concierge_agent": "Concierge, bell desk and valet floor staff.",
    "ird_service": "In-room dining order takers and butlers.",
    "technical": "IT. Ticket-driven.",
    "engineering": "Engineering. Ticket-driven, works from Home rather than Rooms.",
    "fnb_kitchen": "Chat, tickets and lost & found only.",
}

# --- roles the product splits off a shared spec vector -----------------------
#
# The PDF gives all nine Engineering and IT titles one identical 18-right
# vector, which is why they collapsed into a single `technical` role. The
# product decision is that Engineering does not use the Rooms screen at all —
# they work from their own ticket dashboard (Figma 3843-52) — while IT keeps it.
#
# A right cannot vary by title, only by role, so Engineering needs a role of its
# own. It has no vector of its own to be parsed from, so it borrows `technical`'s
# and overrides the part that differs.
#
# DELIBERATE SPEC DRIFT, same standing as RIGHT_OVERRIDES: the signed-off PDF
# grants these four titles Rooms. Do not remove without checking with whoever
# owns the spec.
DERIVED_ROLES = {
    "engineering": {
        "from": "technical",
        "name": "Engineering",
        "rights": {"rooms": False},
    },
}

# Titles moved off the role their spec vector resolves to, onto a derived one.
# Applied after the vector lookup, so re-running the parser cannot silently put
# Engineering back on `technical` and hand them the Rooms tab again.
ROLE_TITLE_OVERRIDES = {
    "director_of_engineering": "engineering",
    "assistant_director_of_engineering": "engineering",
    "engineering_supervisor": "engineering",
    "shift_engineer": "engineering",
}


def slug(name: str) -> str:
    s = name.lower().replace("&", "and").replace("/", " ")
    s = re.sub(r"[^a-z0-9]+", "_", s).strip("_")
    return s


def parse_pdf():
    txt = subprocess.run(["pdftotext", "-layout", str(PDF), "-"],
                         capture_output=True, text=True, check=True).stdout
    dept, rows = None, []
    for ln in txt.split("\n"):
        m = re.match(r"\s*Department\s{3,}(.+?)\s*$", ln)
        if m:
            dept = m.group(1).strip()
            continue
        toks = re.findall(r"\b(YES|NO)\b", ln)
        if len(toks) != 18:
            continue
        title = ln[: ln.index(toks[0])].strip()
        title = re.sub(r"\s{2,}.*$", "", title).strip()
        rows.append((dept, title or "(department-wide)",
                     tuple(t == "YES" for t in toks)))
    return rows


def main():
    rows = parse_pdf()
    if len(rows) != 54:
        sys.exit(f"expected 54 title rows, parsed {len(rows)}")

    vectors = collections.OrderedDict()
    for d, t, v in rows:
        vectors.setdefault(v, []).append((d, t))
    if len(vectors) != 11:
        sys.exit(f"expected 11 distinct vectors, found {len(vectors)}")

    # Bind each vector to its role identity via a known member title.
    vec_to_role = {}
    for key, name, probe in ROLE_BY_MEMBER:
        hit = [v for v, members in vectors.items()
               if any(t == probe for _, t in members)]
        if len(hit) != 1:
            sys.exit(f"role {key!r}: probe {probe!r} matched {len(hit)} vectors")
        vec_to_role[hit[0]] = (key, name)

    titles = []
    for dept_label, raw_title, vec in rows:
        role_key, _ = vec_to_role[vec]
        display = TITLE_FIXES.get(raw_title, raw_title)
        if display in EXECUTIVE_TITLES:
            dept_key = "executive"
        elif raw_title == "(department-wide)":
            dept_key = "food_beverage"
            display = "F&B / Kitchen Staff"
        else:
            dept_key = PDF_DEPT_MAP[dept_label]
        tkey = slug(display)
        # A title may be moved off the role its vector resolves to — see
        # ROLE_TITLE_OVERRIDES.
        role_key = ROLE_TITLE_OVERRIDES.get(tkey, role_key)
        titles.append((tkey, display, dept_key, role_key,
                       HOME_VARIANTS.get(tkey, "default"),
                       ROOMS_VARIANTS.get(tkey, "default")))

    # Every derived role must actually own titles, and must not have emptied
    # the role it was split from — either would mean an override typo.
    title_counts = collections.Counter(role_key for _, _, _, role_key, _, _ in titles)
    for derived, spec in DERIVED_ROLES.items():
        if not title_counts[derived]:
            sys.exit(f"derived role {derived!r} owns no titles; check ROLE_TITLE_OVERRIDES")
        if not title_counts[spec["from"]]:
            sys.exit(f"derived role {derived!r} left {spec['from']!r} with no titles")

    # Ordered permission key list.
    perm_keys = []
    for r in RIGHTS:
        for p in RIGHT_PERMISSIONS[r]:
            if p not in perm_keys:
                perm_keys.append(p)
    for p in ADMIN_ONLY_PERMISSIONS:
        if p not in perm_keys:
            perm_keys.append(p)


    doc = {
        "$comment": (
            "GENERATED by scripts/rbac/parse-spec.py from the signed-off roles "
            "spec. Do not hand-edit; re-run the parser, then npm run rbac:generate."
        ),
        "source": PDF.name,
        "permissions": [
            {"key": p, "description": PERMISSION_DESCRIPTIONS[p]} for p in perm_keys
        ],
        "rights": [
            {"key": r, "label": RIGHT_LABELS[r], "permissions": RIGHT_PERMISSIONS[r]}
            for r in RIGHTS
        ],
        "adminOnlyPermissions": list(ADMIN_ONLY_PERMISSIONS),
        "departments": [
            {"key": k, "name": n, "description": d} for k, n, d in DEPARTMENTS
        ],
        "roles": [],
        "jobTitles": [
            {
                "key": tkey,
                "name": display,
                "department": dept_key,
                "role": role_key,
                "homeVariant": variant,
                "roomsVariant": rooms_variant,
            }
            for tkey, display, dept_key, role_key, variant, rooms_variant in titles
        ],
    }

    # Parsed roles, then the roles derived from them. A derived role is emitted
    # after its source so the source's own rights are never affected.
    emitted = [(key, name, key) for key, name, _probe in ROLE_BY_MEMBER]
    emitted += [(key, spec["name"], spec["from"]) for key, spec in DERIVED_ROLES.items()]

    for key, name, vector_owner in emitted:
        vec = next(v for v, rk in vec_to_role.items() if rk[0] == vector_owner)
        rights = {r: bool(on) for r, on in zip(RIGHTS, vec)}
        # Applied last so they win over the parsed vector — see RIGHT_OVERRIDES
        # and DERIVED_ROLES. A derived role's own overrides come second, so it
        # can differ from the role it borrowed the vector from.
        rights.update(RIGHT_OVERRIDES.get(key, {}))
        if key in DERIVED_ROLES:
            rights.update(DERIVED_ROLES[key]["rights"])
        doc["roles"].append(
            {
                "key": key,
                "name": name,
                "description": ROLE_DESCRIPTIONS[key],
                # Counted from the titles actually assigned, not from the
                # vector: a derived role shares its source's vector, so
                # `len(vectors[vec])` would credit both with all of them.
                "titleCount": title_counts[key],
                "rights": rights,
            }
        )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(doc, indent=2) + "\n")

    print(f"wrote {OUT.relative_to(REPO)}")
    print(f"  {len(perm_keys)} permission keys")
    print(f"  {len(doc['departments'])} departments")
    print(f"  {len(doc['roles'])} roles")
    print(f"  {len(doc['jobTitles'])} job titles")


if __name__ == "__main__":
    main()
