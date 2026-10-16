# Skreenit Suite (phone app)

Separate store app from the hiring app (`mobile-skreenit`). Expo + expo-router; talks to the shared backend at
`/api/v1/suite` (see `mac-skreenit/docs/skreenit-suite/DESIGN.md`). Own login, own session, no shared code with the hiring app.

    npm install
    API_BASE_URL=http://127.0.0.1:8080 npx expo start --lan     # default API: https://api.skreenit.com

Local API without touching a real database: `venv/bin/python scripts/suite_dev_server.py` in `mac-skreenit`
(SQLite; demo owner `owner@demo.test` / `ownerpw1`).

Not done yet: `eas init` (project id), store listing, icons specific to Suite, OTA updates.
