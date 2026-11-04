# Root to Ventures — Website

Static marketing site for **Root to Ventures**, a free entrepreneurship bootcamp for immigrant high school students in Dallas–Fort Worth, and **Venture.bot**, its AI co-founder platform.

## Pages

| File | Purpose |
| --- | --- |
| `index.html` | Home — rotating-image hero, stats, program overview, Venture.bot demo, mentors, winners, roadmap |
| `program.html` | The four-day bootcamp, a typical Saturday, venues, eligibility, VC Demo Day |
| `venture-bot.html` | Venture.bot product page — live chat demo, 16 modules, sprint timeline, FAQ |
| `impact.html` | Cohort 1 results — pre/post growth, scorecard, winners, budget, lessons learned |
| `team.html` | Founding team, mentors & judges, sponsors |
| `apply.html` | Student / mentor / sponsor forms (demo only) + FAQ |

Shared styles live in `assets/css/styles.css`; shared behaviour (nav, hero rotator, scroll reveals, counters, chat demo, tabs, accordion) in `assets/js/main.js`.

## Run locally

No build step. Serve the folder with any static server:

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Notes

- All photography is placeholder imagery loaded from Unsplash; swap for real program photos before launch.
- Forms are demo-only (`data-demo-form`) and do not submit anywhere yet.
- Append `?static` to any URL to disable scroll-reveal animations (useful for screenshots).
