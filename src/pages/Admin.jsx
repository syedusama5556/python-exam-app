import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { BASE_URL } from '../constants'
import {
  Users,
  Award,
  TrendingUp,
  RefreshCw,
  Search,
  ArrowLeft,
  ChevronRight,
  BarChart3,
  RotateCw,
  Eye,
  FileSpreadsheet,
  FileJson,
  Lock,
  LogOut,
  KeyRound,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

export default function Admin() {
  const navigate = useNavigate()
  const [authToken, setAuthToken] = useState(() => sessionStorage.getItem('python_exam_admin_token') || '')
  const [passwordInput, setPasswordInput] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [results, setResults] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [showTopicAnalytics, setShowTopicAnalytics] = useState(false)
  const [regradingId, setRegradingId] = useState(null)

  useEffect(() => {
    if (authToken) {
      fetchData(authToken)
    }
  }, [authToken])

  async function handleLogin(e) {
    e.preventDefault()
    if (!passwordInput.trim()) {
      toast.error('Please enter the admin password')
      return
    }

    setAuthLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput.trim() }),
      })
      const data = await res.json()

      if (res.ok && data.ok) {
        sessionStorage.setItem('python_exam_admin_token', data.token)
        setAuthToken(data.token)
        toast.success('Admin authentication verified')
      } else {
        toast.error(data.detail || 'Invalid admin password')
      }
    } catch {
      toast.error('Failed to connect to authentication service')
    }
    setAuthLoading(false)
  }

  function handleLogout() {
    sessionStorage.removeItem('python_exam_admin_token')
    setAuthToken('')
    setResults([])
    setAnalytics(null)
    toast.success('Signed out of admin center')
  }

  async function fetchData(token = authToken) {
    if (!token) return
    setLoading(true)
    try {
      const headers = { 'x-admin-password': token }
      const [resList, resAnalytics] = await Promise.all([
        fetch(`${BASE_URL}/api/admin/results`, { headers }).then(r => {
          if (r.status === 401) throw new Error('Unauthorized')
          return r.json()
        }),
        fetch(`${BASE_URL}/api/admin/analytics`, { headers }).then(r => {
          if (r.status === 401) throw new Error('Unauthorized')
          return r.json()
        })
      ])
      setResults(resList.results || [])
      setAnalytics(resAnalytics)
    } catch (err) {
      if (err.message === 'Unauthorized') {
        sessionStorage.removeItem('python_exam_admin_token')
        setAuthToken('')
        toast.error('Admin session expired. Please sign in again.')
      } else {
        toast.error('Failed to load admin telemetry')
      }
    }
    setLoading(false)
  }

  async function handleQuickRegrade(e, sessionId) {
    e.stopPropagation()
    setRegradingId(sessionId)
    const loadToast = toast.loading('Re-evaluating submission...')
    try {
      const res = await fetch(`${BASE_URL}/api/admin/regrade/${sessionId}`, {
        method: 'POST',
        headers: { 'x-admin-password': authToken }
      })
      const data = await res.json()
      toast.dismiss(loadToast)
      if (data.ok) {
        toast.success('Candidate re-graded successfully!')
        fetchData()
      } else {
        toast.error('Failed to re-grade session')
      }
    } catch {
      toast.dismiss(loadToast)
      toast.error('Re-grading request failed')
    }
    setRegradingId(null)
  }

  // If not authenticated, show password login screen
  if (!authToken) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4 selection:bg-blue-600 selection:text-white">
        <div className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-sm max-w-md w-full space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>

          <div className="text-center space-y-1">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Admin Access Required
            </h1>
            <p className="text-xs text-slate-500">
              Enter the administrator password defined in your server environment to access candidate analytics.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 pt-2">
            <div>
              <label htmlFor="adminPassword" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Administrator Password
              </label>
              <input
                id="adminPassword"
                type="password"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                placeholder="Enter admin password..."
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 text-sm font-medium transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading || !passwordInput.trim()}
              className="w-full py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm tracking-wide transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {authLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Unlock Admin Center</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center">
            <Link
              to="/"
              className="text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Candidate Exam Portal</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const filteredResults = results.filter(r => {
    const matchesSearch = r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.session_id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesGrade = gradeFilter === 'all' ||
                         (gradeFilter === 'pass' && r.score >= 70) ||
                         (gradeFilter === 'fail' && r.score < 70) ||
                         r.grade === gradeFilter
    return matchesSearch && matchesGrade
  })

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white flex flex-col">
      {/* Top Admin Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20 h-16 flex items-center justify-between px-4 lg:px-8 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
            title="Back to Exam Portal"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Admin Telemetry & Candidate Management
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                Protected
              </span>
            </h1>
            <p className="text-[11px] text-slate-500">Python Basics 60-Question Standardized Assessment</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href={`${BASE_URL}/api/admin/export?format=csv&password=${encodeURIComponent(authToken)}`}
            download="python_exam_results.csv"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Export CSV</span>
          </a>

          <a
            href={`${BASE_URL}/api/admin/export?format=json&password=${encodeURIComponent(authToken)}`}
            download="python_exam_results.json"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-sm"
          >
            <FileJson className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Export JSON</span>
          </a>

          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-700 font-semibold text-xs transition-colors shadow-sm cursor-pointer"
            title="Sign Out of Admin"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span>Total Candidates</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-slate-900">
              {analytics?.totalCandidates || 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Submitted assessments</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span>Average Score</span>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-blue-700">
              {analytics?.averageScore || 0}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Across all 60 questions</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span>Pass Rate (≥70%)</span>
              <Award className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-700">
              {analytics?.passRate || 0}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Certification criteria</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span>Score Spectrum</span>
              <BarChart3 className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-xl font-bold font-mono text-slate-900">
              <span className="text-emerald-700">{analytics?.highestScore || 0}%</span>
              <span className="text-slate-400 mx-1.5">/</span>
              <span className="text-rose-700">{analytics?.lowestScore || 0}%</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Highest vs Lowest</div>
          </div>
        </div>

        {/* Cohort Topic Performance Accordion */}
        {analytics?.topicAverages && Object.keys(analytics.topicAverages).length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowTopicAnalytics(!showTopicAnalytics)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Cohort Topic Performance & Mastery Analytics ({Object.keys(analytics.topicAverages).length} Topics)
                </span>
              </div>
              {showTopicAnalytics ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>

            {showTopicAnalytics && (
              <div className="p-5 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-slate-50/50 animate-slide-up">
                {Object.entries(analytics.topicAverages).map(([topic, avgPct]) => (
                  <div key={topic} className="p-3 rounded-xl bg-white border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-800 truncate max-w-[170px]" title={topic}>{topic}</span>
                      <span className={`font-mono font-bold ${avgPct >= 80 ? 'text-emerald-700' : avgPct >= 50 ? 'text-blue-700' : 'text-rose-700'}`}>
                        {avgPct}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${avgPct >= 80 ? 'bg-emerald-600' : avgPct >= 50 ? 'bg-blue-600' : 'bg-rose-600'}`}
                        style={{ width: `${avgPct}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Candidate Submissions Directory */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
          {/* Table Header Filter Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search candidate name or session ID..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 font-medium"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={gradeFilter}
                onChange={e => setGradeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-700 focus:outline-none focus:border-blue-600 font-medium cursor-pointer"
              >
                <option value="all">All Grades ({results.length})</option>
                <option value="pass">Passed (≥70%)</option>
                <option value="fail">Failed (&lt;70%)</option>
                <option value="A+">Grade A+</option>
                <option value="A">Grade A</option>
                <option value="B">Grade B</option>
                <option value="C">Grade C</option>
              </select>
            </div>
          </div>

          {/* Submissions Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Candidate Name</th>
                  <th className="py-3 px-4">Score (%)</th>
                  <th className="py-3 px-4">Grade</th>
                  <th className="py-3 px-4">Accuracy</th>
                  <th className="py-3 px-4">Points Earned</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Submitted At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <p className="font-semibold text-slate-700 text-sm">No candidate records found</p>
                      <p className="text-xs text-slate-400 mt-1">Completed student exam submissions will appear here automatically.</p>
                    </td>
                  </tr>
                ) : (
                  filteredResults.map(r => {
                    const pass = r.score >= 70
                    const mins = Math.floor((r.timeTakenSeconds || 0) / 60)
                    const secs = (r.timeTakenSeconds || 0) % 60

                    return (
                      <tr
                        key={r.session_id}
                        onClick={() => navigate(`/admin/result/${r.session_id}`)}
                        className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                            {r.studentName}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {r.session_id}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-extrabold text-sm">
                          <span className={pass ? 'text-emerald-700' : 'text-rose-700'}>
                            {r.score}%
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                            r.grade === 'A+' || r.grade === 'A' ? 'bg-emerald-100 text-emerald-800' :
                            r.grade === 'B' || r.grade === 'C' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {r.grade}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-700">
                          {r.correct} / {r.total}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-700">
                          {r.totalScore} / {r.maxPossible}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {mins}m {secs}s
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                          {r.submittedAt}
                        </td>

                        <td className="py-3.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => handleQuickRegrade(e, r.session_id)}
                              disabled={regradingId === r.session_id}
                              className="p-1.5 rounded-lg border border-slate-200 hover:border-blue-300 bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                              title="Re-run evaluation"
                            >
                              <RotateCw className={`w-3.5 h-3.5 ${regradingId === r.session_id ? 'animate-spin' : ''}`} />
                            </button>

                            <Link
                              to={`/admin/result/${r.session_id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs tracking-wide shadow-xs transition-colors"
                            >
                              <span>Inspect Result</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
