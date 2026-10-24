# BetMatrix automation (what runs, when, and how to keep it alive)

Loop: fixtures -> predictions (logged BEFORE kick-off) -> results -> predictions & tickets settled -> ratings learn.

* 05:30 / 11:30 / 16:30 SAST: fixtures sync + predictions (new fixtures only; started matches are never predicted).
* Every 15 min: results sync, only when a finished match is waiting. Settles predictions and pending tickets, then updates team ratings.
* On every server start and every call to `/api/jobs/tick`: catch-up of anything overdue.

Data sources (priority for odds: uploaded Hollywoodbets slate > other books > feeds):
* Upload / paste Hollywoodbets slate: CSV, TSV, Excel .xlsx (Automation & Predictions tab). No API needed.
* Free, no key: football-data.co.uk (CSV: odds + results for major European leagues), ESPN public scoreboard (incl. results).
* Your keys (fallback only, request-budgeted): API-Football, SportAPI.ai, SportMonks, TheRundown.

Keeping it running: free hosts sleep. Create a free job at cron-job.org (or UptimeRobot) that calls
`https://YOUR-APP-URL/api/jobs/tick` every 15 minutes (add `?token=...` if JOBS_TOKEN is set).
Set DATA_DIR to persistent storage, and use Download backup now and then.
