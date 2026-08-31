# Python Basics Exam Application

A full-stack web application for conducting Python fundamentals examinations with AI-powered grading. Built with React + Vite on the frontend and FastAPI on the backend, leveraging Google Gemini for intelligent evaluation of short answers and code submissions.

## Features

### Student Experience
- **60-Question Continuous Exam** — No section breaks; students answer all questions in one sitting
- **18 Python Topics Covered** — Variables, Data Types, Operators, Conditionals, Loops, Functions, Lists, Tuples, Dictionaries, Sets, Strings, List Comprehension, Exception Handling, File Handling, OOP, Modules & Imports, Lambda & Higher-Order Functions, Recursion
- **Mixed Question Types** — Multiple choice, short answer, and code writing
- **Live Sidebar Navigator** — Collapsible question grid showing answered (green), current (blue), and unanswered (gray) questions
- **60-Minute Countdown Timer** — Server-side enforced; auto-submits on expiry
- **Unanswered Question Warning** — Confirmation dialog before submission if questions remain blank
- **Session Persistence** — Resume if the browser closes (localStorage + server session)

### Admin Dashboard
- **Password-Protected Access** — Secure admin login with token-based session management
- **Candidate Management** — Search, filter by grade (A+, A, B, C), pass/fail status
- **Per-Student Inspector** — Full question-by-question breakdown with AI feedback and topic mastery
- **Expand All / Collapse All** — Toggle all question details at once for quick review
- **Cohort Analytics** — Total candidates, average score, pass rate, highest/lowest scores, topic averages
- **Re-grading** — Re-run the AI evaluation engine against any student's submission
- **Export** — Download results as CSV or JSON
- **Print Support** — Print-friendly scorecard layout

### AI Grading Engine
- **Google Gemini Integration** — Uses `gemini-3.6-flash` for intelligent evaluation
- **Lenient Teacher Persona** — AI grades with constructive feedback, not strict rubrics
- **Multi-Tier Fallback** — Falls back to alternative models if primary is unavailable
- **MCQ Auto-Grading** — String comparison for multiple choice (no AI needed)
- **Lazy Client Init** — Gemini client initializes on first use, not at startup

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS |
| Backend | Python FastAPI, Uvicorn |
| AI Grading | Google Gemini (`gemini-3.6-flash`) |
| Deployment | Vercel (serverless) |
| Icons | Lucide React |

## Project Structure

```
mypython-exam-app/
├── server/
│   ├── main.py              # FastAPI app — all API endpoints
│   ├── evaluate.py           # Gemini AI grading engine
│   ├── questions.json        # 60 questions with answer keys
│   ├── vercel.json           # Vercel deployment config
│   ├── requirements.txt      # Python dependencies
│   └── .env                  # GEMINI_API_KEY (not committed)
├── src/
│   ├── pages/
│   │   ├── Landing.jsx       # Student name entry
│   │   ├── Quiz.jsx          # Continuous exam with sidebar + timer
│   │   ├── Result.jsx        # Student-facing scorecard (post-admin release)
│   │   ├── Submitted.jsx     # Post-submission confirmation
│   │   ├── Admin.jsx         # Admin dashboard — candidate list + analytics
│   │   └── AdminResult.jsx   # Admin inspector — per-student detail view
│   ├── components/
│   │   └── CodeBlock.jsx     # Syntax-highlighted code display
│   ├── App.jsx               # React Router setup
│   ├── main.jsx              # App entry with BrowserRouter + Toaster
│   └── constants.js          # BASE_URL configuration
├── design-system/            # UI/UX Pro Max design tokens
├── package.json
├── vite.config.js
└── start.bat                 # Local dev launcher
```

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+
- Google Gemini API key

### 1. Clone the repository
```bash
git clone https://github.com/syedusama5556/python-exam-app.git
cd python-exam-app
```

### 2. Install frontend dependencies
```bash
npm install
```

### 3. Install backend dependencies
```bash
cd server
pip install -r requirements.txt
```

### 4. Configure environment
Create `server/.env`:
```
GEMINI_API_KEY=your_gemini_api_key_here
```

### 5. Run locally
```bash
# Option A: Use the launcher script (Windows)
start.bat

# Option B: Manual
# Terminal 1 — Backend
cd server
python -m uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 6. Build for production
```bash
npm run build
```

## API Endpoints

### Student
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/start` | Start exam session, returns 60 questions |
| POST | `/api/save-answer` | Save a single answer |
| POST | `/api/submit` | Submit exam, triggers AI grading |
| GET | `/api/result/:sessionId` | Fetch graded result |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/login` | Authenticate, returns token |
| GET | `/api/admin/results` | List all submissions |
| GET | `/api/admin/result/:sessionId` | Detailed per-student result |
| GET | `/api/admin/analytics` | Cohort-wide statistics |
| POST | `/api/admin/regrade/:sessionId` | Re-run AI grading |
| GET | `/api/admin/export` | Export CSV or JSON |

### Admin Authentication
Pass the admin token via:
- Header: `x-admin-password: <token>`
- Bearer: `Authorization: Bearer <token>`
- Query: `?password=<token>`

## Deployment

### Vercel
The server is Vercel-ready. Push to GitHub and connect the repo to Vercel:

```bash
# server/vercel.json handles the routing
# In-memory storage is used on Vercel (read-only filesystem)
```

Environment variable needed in Vercel dashboard:
```
GEMINI_API_KEY=your_key_here
ADMIN_PASSWORD=admin123  # optional, defaults to admin123
```

The frontend builds to `dist/` and can be deployed separately or served via Vercel's static site support.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | — | Google Gemini API key (required) |
| `ADMIN_PASSWORD` | `admin123` | Admin panel password |
| `VITE_API_URL` | `''` (same origin) | Backend URL for frontend |
| `VERCEL` | — | Set automatically on Vercel; enables in-memory storage |

## Design System

Built with **UI/UX Pro Max** design tokens — consistent spacing, typography, color palette, and component patterns across all pages. Uses Tailwind CSS utility-first styling with a slate-based neutral palette and blue primary accent.

## License

MIT
