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
}

# Rooms list layout, same reasoning as HOME_VARIANTS: a presentation concern
# keyed by title, not a right. Supervisors work the floor from the list, so they
# get it grouped by housekeeping status with In Progress pinned to the top;
# the housekeeping and executive leadership above them read the flat list.
ROOMS_VARIANTS = {
    "senior_supervisor": "supervisor",
    "supervisor": "supervisor",
    "coordinator": "supervisor",
    # Room attendants get the same banded list, over their own rooms only.
    "housekeeping_room_attendant": "attendant",
}

# Rights we knowingly set differently from the signed-off PDF.
#
# DELIBERATE SPEC DRIFT — do not remove without checking with whoever owns the
# spec. The PDF grants Room Attendants the Dashboard, but the product decision is
# that they work from the Rooms list only and never see Home. `dashboard` is the
# sole source of `tab.home.view`, so clearing it here removes the Home tab, the
# Home landing route and the Home deep link together, and nothing else.
#
# Applied after the PDF is parsed, so re-running the parser cannot silently
# restore Home.
RIGHT_OVERRIDES = {
    "hk_room_attendant": {"dashboard": False},
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
    "technical": "Engineering and IT. Ticket-driven.",
    "fnb_kitchen": "Chat, tickets and lost & found only.",
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
        titles.append((tkey, display, dept_key, role_key,
                       HOME_VARIANTS.get(tkey, "default"),
                       ROOMS_VARIANTS.get(tkey, "default")))

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

    for key, name, _probe in ROLE_BY_MEMBER:
        vec = next(v for v, rk in vec_to_role.items() if rk[0] == key)
        rights = {r: bool(on) for r, on in zip(RIGHTS, vec)}
        # Applied last so it wins over the parsed vector — see RIGHT_OVERRIDES.
        rights.update(RIGHT_OVERRIDES.get(key, {}))
        doc["roles"].append(
            {
                "key": key,
                "name": name,
                "description": ROLE_DESCRIPTIONS[key],
                "titleCount": len(vectors[vec]),
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
