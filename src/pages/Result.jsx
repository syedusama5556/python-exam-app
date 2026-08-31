import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { BASE_URL } from '../constants'
import CodeBlock from '../components/CodeBlock'
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  ArrowLeft,
  RotateCcw,
  Printer,
  ChevronDown,
  ChevronUp,
  BarChart3,
  ListFilter,
  HelpCircle
} from 'lucide-react'

export default function Result() {
  const { sessionId: paramSessionId } = useParams()
  const navigate = useNavigate()
  const sessionId = paramSessionId || sessionStorage.getItem('sessionId') || localStorage.getItem('python_exam_session_id')

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const [expandAll, setExpandAll] = useState(false)

  useEffect(() => {
    if (!sessionId) {
      navigate('/')
      return
    }

    fetch(`${BASE_URL}/api/result/${sessionId}`)
      .then(r => {
        if (!r.ok) throw new Error('Result not found')
        return r.json()
      })
      .then(resData => {
        setData(resData)
        setLoading(false)

        if (resData.score >= 70) {
          try {
            confetti({
              particleCount: 70,
              spread: 60,
              origin: { y: 0.6 },
              colors: ['#2563eb', '#10b981', '#0284c7', '#f59e0b']
            })
          } catch {}
        }
      })
      .catch(() => {
        setLoading(false)
      })
  }, [sessionId, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 text-slate-600">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold">Generating your performance scorecard...</p>
      </div>
    )
  }

  if (!data || data.error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="p-6 rounded-2xl bg-white border border-rose-200 text-rose-800 max-w-md w-full mb-6 shadow-sm">
          <h2 className="text-base font-bold mb-1">Result Not Found</h2>
          <p className="text-xs text-slate-600">
            {data?.error || 'Unable to find an evaluated scorecard for this session.'}
          </p>
        </div>
        <Link
          to="/"
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Exam Portal</span>
        </Link>
      </div>
    )
  }

  const {
    studentName,
    score,
    grade,
    correct,
    total,
    totalScore,
    maxPossible,
    timeTakenSeconds,
    submittedAt,
    topicBreakdown = [],
    details = [],
  } = data

  const minutesTaken = Math.floor(timeTakenSeconds / 60)
  const secondsTaken = timeTakenSeconds % 60
  const pass = score >= 70

  const filteredDetails = details.filter(d => {
    if (filter === 'correct') return d.isCorrect
    if (filter === 'incorrect') return !d.isCorrect
    return true
  })

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white py-10 px-4 sm:px-6 print:bg-white print:py-2">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between print:hidden">
          <Link
            to="/"
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Portal Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Scorecard</span>
            </button>
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake Exam</span>
            </Link>
          </div>
        </div>

        {/* Hero Score Card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-3">
                <span>Certified Python Assessment Report</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-1">
                {studentName}
              </h1>
              <p className="text-xs text-slate-500">
                Submitted on {submittedAt} • Python Basics (18 Topics)
              </p>

              {/* Status Badge */}
              <div className="mt-3">
                {pass ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-800 bg-emerald-50 border border-emerald-300 px-3.5 py-1 rounded-lg text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>PASSED WITH CERTIFICATION</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-50 border border-amber-300 px-3.5 py-1 rounded-lg text-xs font-bold">
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    <span>NEEDS FURTHER PRACTICE (Score &lt; 70%)</span>
                  </span>
                )}
              </div>
            </div>

            {/* Score and Grade Badges */}
            <div className="flex items-center gap-4">
              <div className="text-center p-5 rounded-2xl bg-slate-50 border border-slate-200 min-w-[120px]">
                <div className="text-4xl font-extrabold font-mono tracking-tight text-slate-900 mb-0.5">
                  {score}%
                </div>
                <div className="text-xs text-slate-500 font-semibold">Total Score</div>
              </div>

              <div className="text-center p-5 rounded-2xl bg-blue-50 border border-blue-200 min-w-[120px]">
                <div className="text-4xl font-extrabold font-mono tracking-tight text-blue-700 mb-0.5">
                  {grade}
                </div>
                <div className="text-xs text-blue-600 font-semibold">Grade Rating</div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-slate-100">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-slate-500 text-xs flex items-center gap-1.5 mb-1">
                <Award className="w-3.5 h-3.5 text-blue-600" />
                <span>Points Earned</span>
              </div>
              <div className="text-lg font-bold font-mono text-slate-900">{totalScore} / {maxPossible}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-slate-500 text-xs flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Accuracy Rate</span>
              </div>
              <div className="text-lg font-bold font-mono text-slate-900">{correct} of {total} <span className="text-xs text-slate-400 font-normal">({Math.round((correct/total)*100)}%)</span></div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-slate-500 text-xs flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Time Expended</span>
              </div>
              <div className="text-lg font-bold font-mono text-slate-900">{minutesTaken}m {secondsTaken}s</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-slate-500 text-xs flex items-center gap-1.5 mb-1">
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>Topics Assessed</span>
              </div>
              <div className="text-lg font-bold font-mono text-slate-900">18 Modules</div>
            </div>
          </div>
        </div>

        {/* Topic Mastery Breakdown */}
        {topicBreakdown.length > 0 && (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">Topic Mastery & Skill Breakdown</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {topicBreakdown.map((tb, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800 truncate max-w-[160px]" title={tb.topic}>{tb.topic}</span>
                    <span className={`font-mono font-bold ${tb.percentage >= 80 ? 'text-emerald-700' : tb.percentage >= 50 ? 'text-blue-700' : 'text-rose-700'}`}>
                      {tb.percentage}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${tb.percentage >= 80 ? 'bg-emerald-600' : tb.percentage >= 50 ? 'bg-blue-600' : 'bg-rose-600'}`}
                      style={{ width: `${tb.percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-[10px] text-slate-500 flex justify-between">
                    <span>{tb.correctQuestions} of {tb.totalQuestions} correct</span>
                    <span>{tb.score}/{tb.maxScore} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Question-by-Question Review Matrix */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ListFilter className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">Detailed Question Review & Explanations</h2>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setExpandAll(!expandAll)}
                className="px-3 py-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                {expandAll ? 'Collapse All' : 'Expand All'}
              </button>
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-colors ${filter === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  All ({details.length})
                </button>
                <button
                  onClick={() => setFilter('correct')}
                  className={`px-3 py-1 rounded-lg transition-colors ${filter === 'correct' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Correct ({correct})
                </button>
                <button
                  onClick={() => setFilter('incorrect')}
                  className={`px-3 py-1 rounded-lg transition-colors ${filter === 'incorrect' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Incorrect ({total - correct})
                </button>
              </div>
            </div>
          </div>

          {/* Question List */}
          <div className="space-y-3">
            {filteredDetails.map((d) => {
              const isExpanded = expandAll || expandedId === d.id
              const isCorrect = d.isCorrect

              let qText = d.question || ''
              let qCode = ''
              if (qText.includes('\n\n')) {
                const parts = qText.split('\n\n')
                qText = parts[0]
                qCode = parts.slice(1).join('\n\n')
              }

              return (
                <div
                  key={d.id}
                  className={`rounded-xl border transition-colors overflow-hidden ${
                    isCorrect
                      ? 'bg-emerald-50/20 border-emerald-200'
                      : 'bg-rose-50/20 border-rose-200'
                  }`}
                >
                  <button
                    onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
                    className="w-full p-4 text-left flex items-start justify-between gap-4 cursor-pointer hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-0.5">
                        {isCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono font-bold text-blue-700">Q{d.id}</span>
                          <span className="text-slate-500 font-medium">• {d.topic}</span>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {d.type}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900 leading-snug">
                          {qText}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg ${
                        d.score >= 8 ? 'bg-emerald-100 text-emerald-800' : d.score >= 5 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {d.score}/{d.maxScore} pts
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 border-t border-slate-200/80 space-y-3.5 text-xs bg-white">
                      {qCode && <CodeBlock code={qCode} language="python" />}

                      {/* User Answer vs Expected Standard */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <div className="text-[11px] font-semibold text-slate-500 mb-1">Your Submission:</div>
                          <div className="font-mono text-slate-900 break-words whitespace-pre-wrap">
                            {d.userAnswer || <span className="italic text-slate-400">(No answer provided)</span>}
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
                          <div className="text-[11px] font-semibold text-emerald-800 mb-1">Expected Standard:</div>
                          <div className="font-mono text-emerald-950 break-words whitespace-pre-wrap font-medium">
                            {d.type === 'mcq' && d.options
                              ? `(${d.correctAnswer.toUpperCase()}) ${d.options[d.correctAnswer.toLowerCase()] || ''}`
                              : d.correctAnswer}
                          </div>
                        </div>
                      </div>

                      {/* Feedback */}
                      {d.feedback && (
                        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900">
                          <strong className="text-blue-800 block mb-0.5 font-semibold">Feedback Note:</strong>
                          <p className="leading-relaxed">{d.feedback}</p>
                        </div>
                      )}

                      {/* Explanation */}
                      {d.explanation && (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                          <strong className="text-slate-800 block mb-0.5 font-semibold">Concept Explanation:</strong>
                          <p className="leading-relaxed">{d.explanation}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
