# Repository Guidelines
## Project description
Extracurricular activities and university events play an important role in students’ academic, social, and personal development. Through seminars, workshops, competitions, volunteer activities, and academic events, students can improve their professional knowledge, communication skills, teamwork abilities, and connections with the university community.
However, event organization and participation at many universities in Vietnam are still managed through separate and mostly manual tools such as Google Forms, Excel spreadsheets, Zalo groups, Facebook pages, and paper-based attendance lists. Although these tools are easy to use for small events, they become inefficient and difficult to manage as the number of events and participants increases.
For event organizers, participant data is often distributed across multiple files and communication channels. Organizers must manually review registration forms, update participant lists, manage event capacity, notify students of changes, and record attendance. When an event reaches its maximum capacity, there is usually no automated waiting-list mechanism. Therefore, students may need to register again or contact the organizer directly when a position becomes available.
The manual attendance process also creates several limitations. Organizers may need to check student information individually, resulting in long queues and possible errors or duplicate attendance records. In addition, real-time information about the number of registered, waiting, cancelled, or checked-in participants is not always available.
From the students’ perspective, event information is scattered across different social media pages and communication groups. Students may miss suitable activities because there is no centralized platform for searching, filtering, and receiving personalized event recommendations. The registration status of an event may also be unclear, especially when the event has reached its capacity or when important information such as the time, location, or event status has changed.
To address these problems, the proposed system, named Smart University Event Ecosystem – UniEvent, will provide a centralized web-based platform for university event discovery, registration, management, and attendance tracking. The system mainly serves three user groups: Students, Organizers, and Administrators.Students can create and manage their accounts, browse published events, search and filter events by category and time, view detailed event information, and register online. When an event reaches its maximum capacity, students can join a waiting list and be automatically promoted to the registered participant list when a position becomes available. Students can also receive notifications about registration results, event updates, location changes, and cancellations.
For event attendance, the system supports QR-code-based check-in. Each eligible participant receives a QR code associated with their registration. During the event, the QR code can be scanned to verify the participant and record the check-in result. This process reduces waiting time, prevents duplicate attendance records, and allows organizers to monitor attendance statistics more efficiently.
Organizers can create and manage events with information such as title, description, banner image, category, start and end time, location, maximum capacity, and registration deadline. They can update event details, manage participant lists, monitor waiting-list status, send notifications, and view real-time registration and check-in statistics through a management dashboard.
Administrators are responsible for controlling the overall operation of the platform. They can review organizer access requests, approve or reject submitted verification documents. 
The system also integrates an existing artificial intelligence service to provide personalized event recommendations. Based on students’ interests and previous participation data, the recommendation feature can suggest relevant events and improve the event discovery experience.
Overall, UniEvent aims to replace fragmented and manual event-management processes with a centralized, secure, and convenient platform. The system is expected to reduce the workload of organizers, improve the accuracy of registration and attendance data, and help students discover and participate in suitable university activities more effectively.

## Project Structure & Module Organization

Application code lives under `src/`. The React 19/Vite frontend is in `src/frontend/src`: route-level views belong in `pages/`, reusable UI in `components/`, API clients in `api/` or `lib/`, and static files in `public/` or `src/assets/`. The FastAPI backend is in `src/backend/app`, organized into `routers/`, `services/`, `schemas/`, `models/`, and `core/`. Backend tests live in `src/backend/tests`; Alembic migrations are under `src/backend/alembic/versions`. Project documentation belongs in `docs/`.

## Build, Test, and Development Commands

```powershell
cd src/frontend
npm install          # install frontend dependencies
npm run dev          # start the Vite development server
npm run lint         # lint all JavaScript and JSX
npm run build        # create and validate the production bundle

cd ../backend
pip install -r requirements.txt
uvicorn app.main:app --reload   # start the API locally
pytest -q                       # run backend tests
```

Use `npx eslint src/pages/ExamplePage.jsx` or `pytest tests/test_example.py -q` for focused checks.

## Coding Style & Naming Conventions

Use four spaces for Python and follow PEP 8. Python modules, functions, and variables use `snake_case`; classes use `PascalCase`. Keep routers thin: validation belongs in Pydantic schemas and business logic in services.

Use two-space indentation for React code and treat ESLint as authoritative. Components and page files use `PascalCase` (`EventCard.jsx`); variables and hooks use `camelCase`. Use Tailwind CSS utilities and `lucide-react` icons. Keep user-facing text in Vietnamese and reuse existing API/Supabase clients instead of creating new ones.

## Testing Guidelines

Backend tests use pytest and follow `test_<subject>.py` and `test_<behavior>()` naming. Mock external Supabase and storage calls; tests must not access production data. There is currently no frontend unit-test runner or coverage threshold, so every frontend change must pass targeted ESLint and a production build when routes or integration points change.

## Commit & Pull Request Guidelines

History primarily follows Conventional Commit prefixes such as `feat:`, `docs:`, and `chore:`. Write concise, imperative summaries and keep each commit focused. Pull requests should include a clear description, linked issue when available, verification commands/results, and screenshots for UI changes. Call out migrations, API contract changes, and configuration requirements explicitly.

## Security & Configuration

Never commit `.env` files, access tokens, Supabase keys, generated `dist/`, virtual environments, or credentials. Review the more detailed implementation constraints in `src/AGENTS.md` before changing source code.

## Agent-Specific Instructions

Do not use the Sites skill for frontend design or implementation. Edit the React/Vite source directly and follow repository conventions.
