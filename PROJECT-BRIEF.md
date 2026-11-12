# Move-Out Compare | Hackathon project brief

## The problem

At checkout, tenants and property managers need to establish what changed during a tenancy. Two sets of photos are hard to compare when they show different angles, miss the same fixture, or lack a clear date and location. A visual inventory gives both sides a common record to review.

## What we’ll build

- **Move-in record.** Turn a staged kitchen walkthrough into reference stills for three fixtures. Record the room, fixture, capture date, and source video timestamp where available.
- **Guided checkout.** Show the tenant the corresponding reference photo for each fixture. Provide an optional alignment overlay and a retake prompt when a shot is missing or unsuitable.
- **Evidence review.** Use Grok Bot to propose matches and describe visible changes. Show side-by-side evidence and let a reviewer confirm, correct, or mark a finding unverified. Keep comments tied to the fixture.

## Two-minute demo

1. **0:00–0:25** Open the move-in inventory for one kitchen and select the oven reference.
2. **0:25–0:55** Capture a matching checkout shot with the overlay. Reveal the comparison and open both source images.
3. **0:55–1:30** Show a pre-existing scratch in the worktop pair and changed visible oven condition.
4. **1:30–2:00** Show that the missing fridge interior triggers a retake prompt. Open the final review report with the fridge still marked unverified.

## What counts as done

- All three fixtures appear in a single checkout workflow.
- Each finding opens its source photos and dates. A missing or mismatched photo stays unverified.
- The reviewer can correct a finding and add a note visible in the report.
- The prototype uses staged or synthetic media. The report documents observations and leaves deposit decisions to people.

## Build order

Start with one seeded move-in inventory and a working checkout-to-report flow. Add Grok Bot matching and evidence descriptions, then the camera overlay. Use Cursor to build the capture and review views. Treat automatic walkthrough frame selection, 3D reconstruction, and agency integrations as follow-on work.

**Hackathon track:** Track 4, Asset and Property Management. [Event tracks](https://gb-real-estate-hackathon-11-2026.teamdeel.workers.dev/hackathon#tracks)
