# Parish intake: instructions for the preparation agent

This runbook is for an agent (or a person) turning raw parish material into a
consistent, reviewable data set for building parish profiles. It covers estimate
cards, floor sketches, satellite images, Street View captures and interior
photos. Work one parish at a time and follow the steps in order. Every judgement
the agent is not sure about must go to the human review queue; nothing doubtful
is silently accepted or deleted.

Tools used: `node parish-intake.cjs` (offline helper in the repository root),
the agent's own image viewing, and an image tool for resizing (for example
Python Pillow or ImageMagick if installed). No network services: do not upload
photos, plans or addresses to any third-party service.

## 0. Ground rules

1. **Never modify, rename or delete the user's original files.** Copy them into
   `parishes/<id>/source/` and work on copies. Checksums prove the copies are
   unchanged (`check` fails if a source file changes).
2. **Never invent measurements.** A value you cannot read or derive stays
   `null` (a gap). Derived or estimated values are allowed only with
   `source`, `confidence` and a `note` explaining how they were obtained.
3. **Doubt goes to review.** Mark items `flagged` (needs a human) or `excluded`
   (agent believes unusable) with reason codes. Excluded items are still listed
   for the reviewer, who can rescue them.
4. **Repository size.** Everything lives under `parishes/` in this repository.
   Before copying originals totalling more than 50 MB for one parish, or more
   than 500 MB overall, stop and ask the user (Git LFS or keeping originals
   outside the repository may be preferable). Derived images are always kept.
5. **Ask instead of guessing** when the parish identity of a whole folder is
   unclear, when two parishes seem mixed, or when the source location cannot
   be found.

## 1. Discover and inventory the sources

1. Find where the material is. Ask the user for the location if it is not
   given; look for per-parish folders, spreadsheets listing parishes, addresses
   or coordinates, and file names that contain parish names.
2. Build a parish list: name, address, coordinates (from a spreadsheet, the
   estimate card, or the satellite image's centre if it is georeferenced).
   Choose a stable slug per parish, for example `st-mary-anytown` (lowercase
   letters, digits and hyphens; start with a letter; at most 64 characters).
3. For each parish run:

   ```
   node parish-intake.cjs template st-mary-anytown "St Mary, Anytown"
   ```

   This creates `parishes/<id>/` with `source/`, `derived/`, `review/`,
   an empty `spec.json`, `manifest.json` and `review/decisions.json`.
4. Copy each file into `source/` using a predictable name:
   `<kind>-<nn>.<ext>`, for example `streetview-03.jpg`, `interior-12.jpg`,
   `estimate-card-01.pdf`. Set `manifest.sourceRoot` to the original folder
   (informational) and add one manifest item per file (format below).
5. Files that clearly belong to no parish (screenshots, duplicates of other
   parishes' files) are not copied; list them in your final report.

### Manifest item format (`manifest.json`)

```json
{
  "manifestVersion": 1,
  "parish": "st-mary-anytown",
  "sourceRoot": "D:/Parishes/St Mary",
  "items": [
    {
      "id": "streetview-03",
      "kind": "streetview",
      "original": "Street View/IMG_0412.jpg",
      "file": "source/streetview-03.jpg",
      "derived": "derived/streetview-03.jpg",
      "sha256": "<64 hex characters of source file>",
      "bytes": 482113,
      "captured": "2023-06-14",
      "location": { "lat": 51.5012, "lon": -0.1245 },
      "heading": 212,
      "provenance": "Google Street View screenshot supplied by parish office",
      "licence": "reference-only",
      "status": "flagged",
      "confidence": 0.4,
      "reasons": ["bearing-mismatch", "occluded"],
      "view": "exterior-front",
      "shows": [],
      "notes": "Heading points along the street; church only at right edge behind a bus.",
      "review": null
    }
  ]
}
```

- `kind`: `satellite`, `streetview`, `interior`, `exterior-photo`,
  `estimate-card`, `plan-sketch`, `spreadsheet`, `other`.
- `status`: `pending` (not looked at yet), `accepted`, `flagged`, `excluded`.
- `confidence`: 0–1, the agent's confidence that the item is usable for this
  parish and correctly labelled. Items below 0.8 are queued for review even if
  accepted.
- `reasons`: codes only (see the table below); flagged and excluded items need
  at least one.
- `view`: for photos, one of `entrance-to-sanctuary`, `sanctuary`,
  `sanctuary-left`, `sanctuary-right`, `nave-from-sanctuary`, `side-aisle`,
  `sacristy`, `door`, `exterior-front`, `exterior-side`, `exterior-rear`,
  `detail`, `unknown`; otherwise `null`.
- `shows`: fixtures visible in interior photos: `altar`, `ambo`, `chair`,
  `credence`, `ministers` (servers' seats), `tabernacle`.
- `location` and `heading`: from EXIF, the Street View URL
  (`@lat,lon,...,<heading>h`), or file metadata; `null` if unknown.
- `review`: leave `null`; it is filled by `apply` from the human's decisions.

### Reason codes

| Code | Use when |
| --- | --- |
| `bearing-mismatch` | Heading points 45–135° away from the church |
| `wrong-side` | Heading points more than 135° away, or the photo shows the opposite side of the street |
| `church-not-visible` | No part of the church is visible |
| `other-building` | A different building (neighbouring church, hall, school) is the subject |
| `occluded` | Church mostly hidden by vehicles, trees, scaffolding |
| `blurred`, `too-dark`, `low-resolution` | Image quality makes it unusable for detail |
| `duplicate` | Same or near-same view as another item (keep the best, flag the rest) |
| `location-missing` | No location or heading for a street-level capture |
| `far-from-church` | Capture point more than 150 m from the church |
| `unclear-parish` | Cannot tell which parish the item belongs to |
| `interior-unknown-view` | Interior cannot be oriented |
| `conflict` | Used by the tool for conflicting values |
| `other` | Anything else; explain in `notes` |

## 2. Process each source type

Create a derived copy of every usable image: JPEG, longest side 1600 px,
quality about 85, EXIF orientation applied, all metadata stripped, saved as
`derived/<same id>.jpg`. Read EXIF (date, GPS, heading) from the original
first. PDFs and spreadsheets get no derived copy unless a page render helps the
reviewer (`derived/<id>.jpg`).

### Estimate cards, sketches and spreadsheets

1. Transcribe every value on the card into `spec.json` (format in section 3).
   Convert units to metres and degrees; keep the card's original wording in
   `note` (for example `"note": "card: 'pitch approx 40°'"`), set
   `source: "card"`, `ref` to the manifest item id, and add the item id to
   `spec.cards`.
2. Confidence: `high` for a printed measured value, `medium` for a stated
   approximation ("approx.", "c."), `low` for a value you derived from a sketch
   or by calculation.
3. Do not fill fields the card does not mention. Map wording to the allowed
   values (for example "slate-roofed" -> `roof.material: "slate"`); if no value
   fits, use `other` and explain in `note`.

### Satellite images

1. Check the image is centred on the right address; otherwise flag
   `unclear-parish`.
2. Measure the roof footprint length and width when a scale bar or known
   resolution is available (`source: "satellite"`, usually `medium`). Without a
   scale, record nothing numeric; note the shape only.
3. Record `footprint.planForm`, `footprint.apseDepth` if visible, the
   bearing of the main façade (`site.facadeBearing`, the compass direction the
   entrance faces), the belfry position, and roof colour (`roof.colour`, sampled
   from a sunlit area, as `#rrggbb`).
4. Compare with the card's footprint. A difference above 10 % or 2 m is a
   conflict (section 3).

### Street View and other exterior photos

For each capture, apply both checks and record the outcome:

1. **Rule check.** With `spec.location` set and the capture's `location` and
   `heading` recorded, run `node parish-intake.cjs aim <id>`. It prints, per
   item, the bearing to the church, how far the heading is off and the
   distance, plus suggested reason codes (`bearing-mismatch`, `wrong-side`,
   `far-from-church`, `location-missing`).
2. **Visual check.** Look at the image. Is a church visible? Is it this church
   (compare with the card, the satellite roof shape, other accepted photos:
   tower position, window style, materials)? Is it the front, side or rear?
3. Decide:
   - both checks agree it shows the church clearly -> `accepted`,
     confidence 0.8–1;
   - the church is visible but partly hidden, distant or the rule check fails
     while the picture looks right -> `flagged`, 0.4–0.8;
   - no church, the wrong building, or the opposite side of the street ->
     `excluded`, below 0.4.
4. From accepted views record wall material and colour, roof form, window
   style and counts, door size estimates (relative to a standard 2.1 m door
   height, `low` confidence), belfry type, top and approximate height (count
   storeys at about 3.5 m, `low`).

### Interior photos

1. Classify `view` and list the fixtures in `shows`. Use `interior-unknown-view`
   when you cannot orient the photo.
2. Check the interior plausibly belongs to this church (window shapes and
   counts consistent with the exterior, roof form visible inside); otherwise flag
   `unclear-parish`.
3. Estimate fixture positions only when a photo shows them against
   countable references (pew rows at about 0.9 m pitch, floor tiles, steps).
   Record `fixtures.<id>.across` and `.depth` with `source: "interior"`,
   `confidence: "low"` and how you estimated it in `note`.
4. Record seating layout (central aisle or full-width blocks), number of
   rows per side, aisle widths and which side the sacristy door is on.

## 3. Parish spec format (`spec.json`)

The spec is the single place where measurements and descriptions are gathered.
Every field under `values` must be present (the template lists them all) and
has this shape:

```json
"roof.pitch": {
  "value": 40,
  "unit": "deg",
  "source": "card",
  "confidence": "medium",
  "ref": "estimate-card-01",
  "note": "card: 'pitch approx 40 degrees'"
}
```

- `value`: number, allowed word, `#rrggbb` colour, or `null` for a gap. For a
  gap, `source` and `confidence` must also be `null`.
- `unit`: fixed per field: `m`, `deg`, `count`, `enum` or `hex`.
- `source`: `card`, `satellite`, `streetview`, `interior`,
  `exterior-photo`, `plan-sketch`, `spreadsheet`, `estimate`, `reviewer`.
- `confidence`: `low`, `medium` or `high`.
- `ref`: manifest item id the value came from (or `null`).

Top level: `specVersion` (1), `id`, `name`, `address`, `location`
(`{lat, lon}` of the main entrance or roof centre), `cards` (manifest ids of
estimate cards), `values`, `conflicts`, `notes`.

### Fields

Measurements are metres unless stated. Interior positions use a church-local
frame: **across** is the sideways distance from the central axis, positive to
the right when facing the altar from the main door; **depth** is the distance
from the back wall of the sanctuary towards the main door.

| Group | Fields and allowed values |
| --- | --- |
| Site | `site.facadeBearing` (deg, 0–360, direction the entrance faces) |
| Footprint | `footprint.length`, `footprint.width`, `footprint.apseDepth`; `footprint.planForm`: rectangle, cruciform, L-shape, apsed, round, other |
| Walls | `walls.material`: brick, stone, render, concrete, timber, metal, other; `walls.colour` (hex); `walls.eaveHeight` |
| Roof | `roof.form`: gable, hip, flat, barrel, mansard, shed, other; `roof.pitch` (deg, 0–75); `roof.material`: slate, tile, metal, copper, felt, shingle, other; `roof.colour` (hex); `roof.ridgeHeight` |
| Belfry | `belfry.type`: none, bellcote, tower, spire, campanile; `belfry.position`: none, front-centre, front-left, front-right, side, rear, detached; `belfry.width`, `belfry.depth`, `belfry.height` (to top of the tower body); `belfry.top`: none, flat, parapet, pyramid, spire, onion, dome, gable; `belfry.spireHeight` (above the tower body) |
| Openings | `openings.mainDoorWidth`, `openings.mainDoorHeight`; `openings.windowStyle`: lancet, round-arch, rectangular, rose, mixed, none; `openings.windowsLeft`, `openings.windowsRight` (count, per nave side, facing the altar) |
| Interior | `interior.naveLength` (sanctuary back wall to inside of main door), `interior.naveWidth`, `interior.naveHeight`, `interior.sanctuaryDepth`, `interior.sanctuarySteps` (count); `interior.seatingStyle`: aisles (central aisle plus side aisles) or full (one block across); `interior.pewRowsLeft`, `interior.pewRowsRight` (count); `interior.seatingLeftOuter`, `interior.seatingLeftInner` (across, negative), `interior.seatingRightInner`, `interior.seatingRightOuter` (across, positive) - the side edges of the pew blocks; `interior.firstPew`, `interior.lastPew` (depth of the front edge of the first row and the back edge of the last row); `interior.mainDoorAcross`; `interior.sacristySide`: left, right, behind, none; `interior.sacristyDoorDepth` |
| Fixtures | `fixtures.<altar, ambo, chair, credence, ministers, tabernacle>.across` and `.depth` (centre of each item; `chair` is the presider's chair, `ministers` the servers' seats) |

### Conflicts

When sources disagree (card vs satellite footprint, two cards, photo vs card),
choose the more reliable value for `values`, then add an entry:

```json
{
  "id": "footprint-length",
  "field": "footprint.length",
  "candidates": [
    { "source": "card", "ref": "estimate-card-01", "value": 32 },
    { "source": "satellite", "ref": "satellite-01", "value": 27.5 }
  ],
  "chosen": 27.5,
  "reason": "Satellite has a scale bar; card says 'approx.'",
  "status": "open"
}
```

Prefer, in order: measured plans, satellite with a scale, the card, photo
estimates. The reviewer decides open conflicts.

## 4. Draft the training layout

```
node parish-intake.cjs check st-mary-anytown
node parish-intake.cjs draft st-mary-anytown
```

`draft` turns the interior values into `profile.draft.json`, a
`ChurchProfiles` version 1 profile (see `mass-parishes.js`), and writes
`profile-report.json` listing:

- `missing` fields (the generic layout is used for those),
- `clamped` values (the real position was pulled into the supported range),
- `limitations` (for example a left-hand sacristy, cruciform plan, belfry or
  roof pitch the current `rectangular-v1` shell cannot draw yet),
- `errors` if the draft still fails validation.

Positions are scaled so the nave width and length fill the prepared shell; the
layout keeps relative positions, not exact distances. Exterior fields (roof
pitch, materials, belfry) are kept in the spec for future shells; today only
the wall and roof colours reach the profile. Import `profile.draft.json` in the
parish editor ("Prepare a parish") to adjust and check routes.

## 5. Build the review queue

```
node parish-intake.cjs index
```

This regenerates `parishes/<id>/review/queue.json` for every parish and the
combined `parishes/review-index.js`. The queue contains:

- **images** that are flagged, excluded, pending or below 0.8 confidence,
- **open conflicts**,
- **gaps**: missing or low-confidence key measurements,
- **draft layout** adjustments (clamps, limitations, errors).

Items already decided are not queued again. A gap or draft item reappears only
if its content changes.

## 6. Human review

Open `parish-review.html` directly from the folder (no server needed). It
shows a contact sheet with filters (parish, type, agent suggestion, decided or
not) and a one-by-one mode:

- **A** accept, **R** reject, **S** or Right Arrow skip, **B** or Left Arrow
  back, **C** focus the comment box, **Esc** back to the contact sheet;
- type a comment and press **Ctrl+Enter** to accept with that comment;
- after each decision it moves to the next undecided item.

Decisions are saved in the browser. When finished, press **Export decisions**
and give the downloaded `parish-review-decisions.json` to the agent.

## 7. Apply decisions

```
node parish-intake.cjs apply path/to/parish-review-decisions.json
```

For images, accept sets `status: "accepted"` and reject sets `"excluded"`; the
decision and comment are stored in the item's `review`. Conflicts become
`resolved` (accepted) or `rejected` (the agent must revisit the value, guided
by the comment). Every decision is appended to `review/decisions.json`, and
the index is rebuilt. Act on comments (for example correct a `view` label or
replace a value with `source: "reviewer"`), then rerun `draft` and `index`.

## 8. Finish a parish

A parish is ready for modelling when `check` passes, the queue is empty, the
draft is valid, and the report below exists. Write `parishes/<id>/README.md`
with:

- source counts per kind and how many were accepted, flagged and excluded,
- remaining gaps and what material would close them (for example "photo from
  the sanctuary towards the door", "measured nave width"),
- limitations from `profile-report.json`,

Finally summarise all parishes for the user: ready, waiting for review,
needing more material.
