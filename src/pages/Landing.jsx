import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { BASE_URL } from '../constants'
import {
  BookOpen,
  Clock,
  Award,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Lock,
  RotateCcw,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

const TOPICS_LIST = [
  "Hello World and Basics",
  "Variables and Identifiers",
  "Built-in Data Types",
  "Type Conversion",
  "String Indexing and Slicing",
  "String Methods",
  "f-Strings and Formatting",
  "Arithmetic Operators",
  "Comparison and Identity",
  "Conditionals and Ternary",
  "List Slicing and Nesting",
  "Tuple Immutability and Unpacking",
  "Set Uniqueness and Operations",
  "Dictionary Methods and Views",
  "For Loops and Enumerate",
  "While Loops and Control Flow",
  "List Methods (sort and extend)",
  "Dictionary Merging and Advanced Views"
]

export default function Landing() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [existingSession, setExistingSession] = useState(null)
  const [showTopics, setShowTopics] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const savedSessionId = localStorage.getItem('python_exam_session_id') || sessionStorage.getItem('sessionId')
    const savedName = localStorage.getItem('python_exam_student_name') || sessionStorage.getItem('studentName')

    if (savedSessionId && savedName) {
      fetch(`${BASE_URL}/api/session/${savedSessionId}`)
        .then(r => r.json())
        .then(data => {
          if (data && !data.error && !data.submitted && data.remainingMs > 0) {
            setExistingSession({
              sessionId: savedSessionId,
              studentName: savedName,
              remainingMs: data.remainingMs,
              answeredCount: Object.keys(data.answers || {}).length,
            })
          } else if (data.submitted) {
            localStorage.removeItem('python_exam_session_id')
            sessionStorage.removeItem('sessionId')
          }
        })
        .catch(() => {})
    }
  }, [])

  async function handleStart(e) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Please enter your full name to proceed')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/api/start-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentName: name.trim() }),
      })
      const data = await res.json()

      if (data.error || res.status >= 400) {
        toast.error(data.detail || data.error || 'Failed to start exam')
        setLoading(false)
        return
      }

      sessionStorage.setItem('sessionId', data.sessionId)
      sessionStorage.setItem('studentName', data.studentName)
      localStorage.setItem('python_exam_session_id', data.sessionId)
      localStorage.setItem('python_exam_student_name', data.studentName)

      toast.success(`Welcome ${data.studentName}! Exam initialized.`)
      navigate('/quiz')
    } catch {
      toast.error('Cannot connect to exam server. Please check backend status.')
      setLoading(false)
    }
  }

  function handleResume() {
    if (existingSession) {
      sessionStorage.setItem('sessionId', existingSession.sessionId)
      sessionStorage.setItem('studentName', existingSession.studentName)
      navigate('/quiz')
    }
  }

  function handleDismissSession() {
    localStorage.removeItem('python_exam_session_id')
    localStorage.removeItem('python_exam_student_name')
    sessionStorage.removeItem('sessionId')
    sessionStorage.removeItem('studentName')
    setExistingSession(null)
    toast.success('Previous session cleared')
  }

  const remainingMins = existingSession ? Math.ceil(existingSession.remainingMs / 60000) : 0

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-mono font-bold text-white text-sm">
              Py
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                PythonPro Assessment Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="text-xs font-semibold text-slate-700 hover:text-blue-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white transition-colors flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Admin Access</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 py-12 flex-1 flex flex-col items-center justify-center w-full">
        {/* Active Session Resumption Banner */}
        {existingSession && (
          <div className="w-full mb-8 p-4 rounded-xl bg-amber-50 border border-amber-200 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-800 mt-0.5">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    Active Exam Session Found
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-semibold">
                      ~{remainingMins}m remaining
                    </span>
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Candidate: <strong className="text-slate-900">{existingSession.studentName}</strong> ({existingSession.answeredCount} of 60 questions answered)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleDismissSession}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  Discard
                </button>
                <button
                  onClick={handleResume}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Resume Exam</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Title and Scope */}
        <div className="text-center max-w-xl mx-auto mb-8 space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Python Core Assessment
          </h1>
          <p className="text-slate-600 text-sm leading-relaxed">
            Standardized 60-question examination covering 18 foundational Python modules. Each question is evaluated with syntax validation, Python AST parsing, and rubric matching.
          </p>
        </div>

        {/* Exam Parameter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full mb-8">
          <div className="bg-white border border-slate-200 p-3.5 rounded-xl text-left">
            <div className="text-slate-500 text-xs font-medium flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Time Allowed</span>
            </div>
            <div className="text-base font-bold text-slate-900">60 Minutes</div>
            <div className="text-[11px] text-slate-500">Auto-submits at 0:00</div>
          </div>

          <div className="bg-white border border-slate-200 p-3.5 rounded-xl text-left">
            <div className="text-slate-500 text-xs font-medium flex items-center gap-1.5 mb-1">
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>Question Count</span>
            </div>
            <div className="text-base font-bold text-slate-900">60 Items</div>
            <div className="text-[11px] text-slate-500">MCQ, Short, and Code</div>
          </div>

          <div className="bg-white border border-slate-200 p-3.5 rounded-xl text-left">
            <div className="text-slate-500 text-xs font-medium flex items-center gap-1.5 mb-1">
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              <span>Progress Sync</span>
            </div>
            <div className="text-base font-bold text-slate-900">Auto-Saved</div>
            <div className="text-[11px] text-slate-500">Local and server backup</div>
          </div>

          <div className="bg-white border border-slate-200 p-3.5 rounded-xl text-left">
            <div className="text-slate-500 text-xs font-medium flex items-center gap-1.5 mb-1">
              <Award className="w-3.5 h-3.5 text-blue-600" />
              <span>Passing Score</span>
            </div>
            <div className="text-base font-bold text-slate-900">70% or Higher</div>
            <div className="text-[11px] text-slate-500">Certificate benchmark</div>
          </div>
        </div>

        {/* Start Candidate Card */}
        <div className="w-full max-w-md bg-white p-6 sm:p-7 rounded-xl border border-slate-200 shadow-xs mb-8">
          <form onSubmit={handleStart} className="space-y-4">
            <div>
              <label htmlFor="studentName" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Candidate Name
              </label>
              <input
                id="studentName"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your full name..."
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 text-sm font-medium transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full py-3 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs tracking-wide transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Starting Assessment...</span>
                </>
              ) : (
                <>
                  <span>Begin 60-Minute Assessment</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Proctored Timer</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Network Resilient</span>
            </span>
          </div>
        </div>

        {/* Curriculum Topics List */}
        <div className="w-full max-w-2xl">
          <button
            onClick={() => setShowTopics(!showTopics)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>View Exam Syllabus (18 Modules)</span>
            </span>
            {showTopics ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>

          {showTopics && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 p-3.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 animate-slide-up">
              {TOPICS_LIST.map((topic, i) => (
                <div key={i} className="flex items-center gap-2 p-1.5 rounded bg-slate-50">
                  <span className="w-5 h-5 rounded bg-blue-100 text-blue-700 font-mono text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="truncate">{topic}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>PythonPro Assessment Engine</span>
          <span className="text-slate-600">Standardized Python 3.11 Evaluation Rubric</span>
        </div>
      </footer>
    </div>
  )
}
