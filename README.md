# Roots to Ventures — Website

Static marketing site for **Roots to Ventures**, a free entrepreneurship program for first-generation immigrant high school students in Dallas–Fort Worth, and **Venture.bot**, its AI co-founder platform.

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

## Venture.bot AI

To enable the OpenAI-backed chat and grader locally, set `OPENAI_API_KEY` and run the included server:

```bash
OPENAI_API_KEY=your-key python3 server.py
# open http://localhost:8080
```

Alternatively, put `OPENAI_API_KEY=your-key` in a `.env` file in the repo root; `server.py` loads it without overriding variables already in the environment. The `.env` file is ignored by Git.

On Vercel, deploy the repository and set `OPENAI_API_KEY` as an environment variable. The Python files in `api/` become serverless functions at `/api/chat` and `/api/grade`.

On purely static hosting such as GitHub Pages, chat falls back to the scripted demo and the grader displays an error because no backend is available. Optional model settings are `VENTUREBOT_CHAT_MODEL` (default `gpt-4.1-mini`) and `VENTUREBOT_GRADE_MODEL` (default `gpt-4.1`).

## Notes

- All photography is placeholder imagery loaded from Unsplash; swap for real program photos before launch.
- Forms are demo-only (`data-demo-form`) and do not submit anywhere yet.
- Append `?static` to any URL to disable scroll-reveal animations (useful for screenshots).
