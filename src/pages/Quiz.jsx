import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import CodeBlock from '../components/CodeBlock'
import { BASE_URL } from '../constants'
import {
  Clock,
  Flag,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Menu,
  X,
  Send,
  CloudCheck,
  RefreshCw,
  Code2,
  Maximize2,
  Minimize2,
  BookmarkCheck
} from 'lucide-react'

function formatTime(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function Quiz() {
  const navigate = useNavigate()
  const sessionId = sessionStorage.getItem('sessionId') || localStorage.getItem('python_exam_session_id')
  const studentName = sessionStorage.getItem('studentName') || localStorage.getItem('python_exam_student_name')

  const [questions, setQuestions] = useState([])
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [flags, setFlags] = useState({})
  const [remainingMs, setRemainingMs] = useState(3600000)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showConfirm, setShowConfirm] = useState(false)
  const [filterMode, setFilterMode] = useState('all')
  const [saveStatus, setSaveStatus] = useState('saved')
  const [isFullscreen, setIsFullscreen] = useState(false)

  const timerRef = useRef(null)
  const saveTimeoutRef = useRef({})

  useEffect(() => {
    if (!sessionId) {
      toast.error('No active session found. Please enter your name.')
      navigate('/')
      return
    }

    const localAnswersKey = `python_exam_answers_${sessionId}`
    const localFlagsKey = `python_exam_flags_${sessionId}`
    let cachedAnswers = {}
    let cachedFlags = {}

    try {
      cachedAnswers = JSON.parse(localStorage.getItem(localAnswersKey) || '{}')
      cachedFlags = JSON.parse(localStorage.getItem(localFlagsKey) || '{}')
    } catch {}

    fetch(`${BASE_URL}/api/questions`)
      .then(r => r.json())
      .then(data => {
        setQuestions(data.questions || [])
        setLoading(false)
      })
      .catch(() => {
        toast.error('Failed to load questions. Retrying...')
      })

    fetch(`${BASE_URL}/api/session/${sessionId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error || data.submitted) {
          toast.success('Exam already submitted. Loading scorecard...')
          navigate(`/result/${sessionId}`)
          return
        }
        setRemainingMs(data.remainingMs)

        const mergedAnswers = { ...(data.answers || {}), ...cachedAnswers }
        const mergedFlags = { ...(data.flags || {}), ...cachedFlags }
        setAnswers(mergedAnswers)
        setFlags(mergedFlags)

        if (Object.keys(cachedAnswers).length > 0) {
          fetch(`${BASE_URL}/api/sync-answers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, answers: mergedAnswers, flags: mergedFlags }),
          }).catch(() => {})
        }
      })
      .catch(() => {
        toast.error('Working in offline backup mode')
      })
  }, [sessionId, navigate])

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setRemainingMs(prev => {
        if (prev <= 1000) {
          clearInterval(timerRef.current)
          handleTimeExpired()
          return 0
        }
        return prev - 1000
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  function handleTimeExpired() {
    toast.error('Time has expired! Submitting your answers automatically...', { duration: 4000 })
    doSubmit()
  }

  const saveAnswer = useCallback((qid, value) => {
    const qidStr = String(qid)
    const updatedAnswers = { ...answers, [qidStr]: value }
    setAnswers(updatedAnswers)
    setSaveStatus('saving')

    try {
      localStorage.setItem(`python_exam_answers_${sessionId}`, JSON.stringify(updatedAnswers))
    } catch {}

    if (saveTimeoutRef.current[qidStr]) {
      clearTimeout(saveTimeoutRef.current[qidStr])
    }

    saveTimeoutRef.current[qidStr] = setTimeout(async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/save-answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            questionId: parseInt(qid),
            answer: value,
            flagged: flags[qidStr] || false,
          }),
        })
        if (res.ok) {
          setSaveStatus('saved')
        } else {
          setSaveStatus('offline')
        }
      } catch {
        setSaveStatus('offline')
      }
    }, 400)
  }, [answers, flags, sessionId])

  const toggleFlag = (qid) => {
    const qidStr = String(qid)
    const newFlag = !flags[qidStr]
    const updatedFlags = { ...flags, [qidStr]: newFlag }
    setFlags(updatedFlags)

    try {
      localStorage.setItem(`python_exam_flags_${sessionId}`, JSON.stringify(updatedFlags))
    } catch {}

    fetch(`${BASE_URL}/api/save-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        questionId: parseInt(qid),
        answer: answers[qidStr] || '',
        flagged: newFlag,
      }),
    }).catch(() => {})
  }

  useEffect(() => {
    function handleKeyDown(e) {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        return
      }

      if (e.key === 'ArrowRight' || (e.altKey && e.key.toLowerCase() === 'n')) {
        e.preventDefault()
        setCurrent(c => Math.min(questions.length - 1, c + 1))
      } else if (e.key === 'ArrowLeft' || (e.altKey && e.key.toLowerCase() === 'p')) {
        e.preventDefault()
        setCurrent(c => Math.max(0, c - 1))
      } else if (e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        if (questions[current]) {
          toggleFlag(questions[current].id)
        }
      } else if (questions[current]?.type === 'mcq' && ['1', '2', '3', '4', 'a', 'b', 'c', 'd'].includes(e.key.toLowerCase())) {
        const keyMap = { '1': 'a', '2': 'b', '3': 'c', '4': 'd' }
        const chosen = keyMap[e.key] || e.key.toLowerCase()
        if (questions[current].options?.[chosen]) {
          saveAnswer(questions[current].id, chosen)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [current, questions, saveAnswer])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  async function doSubmit() {
    if (submitting) return
    setSubmitting(true)
    setShowConfirm(false)
    clearInterval(timerRef.current)

    const loadingToast = toast.loading('Grading your responses...')

    try {
      const res = await fetch(`${BASE_URL}/api/submit-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      const data = await res.json()
      toast.dismiss(loadingToast)

      if (data.ok) {
        toast.success('Exam graded successfully! Loading scorecard...')
        localStorage.removeItem(`python_exam_answers_${sessionId}`)
        localStorage.removeItem(`python_exam_flags_${sessionId}`)
        navigate(`/result/${sessionId}`)
      } else {
        toast.error('Submission recorded. Redirecting...')
        navigate(`/result/${sessionId}`)
      }
    } catch {
      toast.dismiss(loadingToast)
      toast.error('Submission complete. Loading results...')
      navigate(`/result/${sessionId}`)
    }
  }

  const handleCodeKeyDown = (e, qid) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = e.target
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const val = textarea.value
      const newVal = val.substring(0, start) + '    ' + val.substring(end)
      saveAnswer(qid, newVal)
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4
      }, 0)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 text-slate-600">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold">Loading questions and initializing session...</p>
      </div>
    )
  }

  const total = questions.length
  const answeredCount = Object.values(answers).filter(v => v !== undefined && v !== '').length
  const flaggedCount = Object.values(flags).filter(Boolean).length
  const unansweredCount = total - answeredCount
  const q = questions[current] || {}
  const currentAnswer = answers[String(q.id)] || ''
  const isCurrentFlagged = !!flags[String(q.id)]

  const timeWarning = remainingMs < 300000
  const timeCritical = remainingMs < 60000

  const filteredIndices = questions.map((item, idx) => ({ item, idx })).filter(({ item }) => {
    const isAns = !!answers[String(item.id)]
    const isFlg = !!flags[String(item.id)]
    if (filterMode === 'answered') return isAns
    if (filterMode === 'unanswered') return !isAns
    if (filterMode === 'flagged') return isFlg
    return true
  })

  let questionMainText = q.question || ''
  let questionCodeSnippet = ''
  if (questionMainText.includes('\n\n')) {
    const parts = questionMainText.split('\n\n')
    questionMainText = parts[0]
    questionCodeSnippet = parts.slice(1).join('\n\n')
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Pre-Submission Audit Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 md:p-8 max-w-lg w-full">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Review and Submit Exam</h3>

            <p className="text-slate-600 text-xs leading-relaxed mb-6">
              Review your progress before final evaluation. Once submitted, your answers will be evaluated and your scorecard will be generated.
            </p>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <div className="text-xl font-bold text-emerald-700">{answeredCount}</div>
                <div className="text-[11px] text-emerald-600 font-medium">Answered</div>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                <div className="text-xl font-bold text-amber-700">{flaggedCount}</div>
                <div className="text-[11px] text-amber-600 font-medium">Flagged</div>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-center">
                <div className="text-xl font-bold text-rose-700">{unansweredCount}</div>
                <div className="text-[11px] text-rose-600 font-medium">Unanswered</div>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5 mb-6">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                <span>
                  You have <strong>{unansweredCount} unanswered question{unansweredCount > 1 ? 's' : ''}</strong>. Unanswered questions receive 0 points.
                </span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Continue Exam
              </button>
              <button
                onClick={doSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Grading...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Submit</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20 h-16 flex items-center justify-between px-4 lg:px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Toggle Question Palette"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-600 font-mono font-bold text-xs flex items-center justify-center text-white shadow-sm">
              Py
            </span>
            <div className="hidden sm:block">
              <h1 className="text-xs font-bold text-slate-900 leading-tight">PythonPro Assessment</h1>
              <p className="text-[10px] text-slate-500 font-medium truncate max-w-[160px]">{studentName}</p>
            </div>
          </div>
        </div>

        {/* Progress & Live Save Indicator */}
        <div className="hidden md:flex items-center gap-4">
          <div className="text-xs font-medium text-slate-600 flex items-center gap-2">
            <span>Progress:</span>
            <span className="font-bold text-blue-600 font-mono">{answeredCount}/{total}</span>
            <span className="text-slate-400">({Math.round((answeredCount / total) * 100)}%)</span>
          </div>

          <div className="w-32 h-2 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${(answeredCount / total) * 100}%` }}
            ></div>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            {saveStatus === 'saving' ? (
              <span className="flex items-center gap-1 text-amber-600">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Syncing...</span>
              </span>
            ) : saveStatus === 'offline' ? (
              <span className="flex items-center gap-1 text-slate-600" title="Saved locally in browser">
                <CheckCircle2 className="w-3 h-3 text-slate-500" />
                <span>Saved locally</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-600">
                <CloudCheck className="w-3.5 h-3.5" />
                <span>Saved</span>
              </span>
            )}
          </div>
        </div>

        {/* Timer & Submit Button */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono font-bold text-xs tracking-wider ${
              timeCritical
                ? 'bg-rose-50 border-rose-300 text-rose-700'
                : timeWarning
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTime(remainingMs)}</span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="hidden sm:flex p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setShowConfirm(true)}
            disabled={submitting}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs tracking-wide shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            Submit Exam
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar / Question Palette */}
        <aside
          className={`${
            sidebarOpen ? 'w-72 border-r' : 'w-0 border-r-0'
          } border-slate-200 bg-white transition-all duration-200 flex-shrink-0 flex flex-col overflow-hidden z-10`}
        >
          <div className="p-3.5 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <BookmarkCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Question Palette</span>
            </span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-lg text-slate-500 hover:text-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Palette Filter Tabs */}
          <div className="p-2 grid grid-cols-4 gap-1 border-b border-slate-200 text-[11px] font-semibold">
            <button
              onClick={() => setFilterMode('all')}
              className={`py-1 rounded-lg transition-colors ${filterMode === 'all' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              All ({total})
            </button>
            <button
              onClick={() => setFilterMode('answered')}
              className={`py-1 rounded-lg transition-colors ${filterMode === 'answered' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Ans ({answeredCount})
            </button>
            <button
              onClick={() => setFilterMode('unanswered')}
              className={`py-1 rounded-lg transition-colors ${filterMode === 'unanswered' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Left ({unansweredCount})
            </button>
            <button
              onClick={() => setFilterMode('flagged')}
              className={`py-1 rounded-lg transition-colors ${filterMode === 'flagged' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Flag ({flaggedCount})
            </button>
          </div>

          {/* Question Grid */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-5 gap-2">
              {filteredIndices.map(({ item, idx }) => {
                const isCurrent = idx === current
                const hasAnswer = !!answers[String(item.id)]
                const isFlagged = !!flags[String(item.id)]

                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrent(idx)}
                    className={`relative w-full aspect-square rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                      isCurrent
                        ? 'ring-2 ring-blue-500 bg-blue-600 text-white shadow-sm'
                        : isFlagged
                          ? 'bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100'
                          : hasAnswer
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                            : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isFlagged && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Palette Legend */}
          <div className="p-3 border-t border-slate-200 text-[11px] text-slate-600 space-y-1.5 flex-shrink-0 bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-md bg-emerald-100 border border-emerald-400"></span>
              <span>Answered ({answeredCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-md bg-amber-100 border border-amber-400"></span>
              <span>Flagged for Review ({flaggedCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-md bg-slate-100 border border-slate-300"></span>
              <span>Unanswered ({unansweredCount})</span>
            </div>
          </div>
        </aside>

        {/* Center Question Viewport */}
        <main className="flex-1 flex flex-col justify-between overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto w-full">
          <div className="space-y-6">
            {/* Question Card */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                    {q.topic || 'Python Core'}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                    {q.type === 'mcq' ? 'Multiple Choice' : q.type === 'short' ? 'Short Answer' : 'Code Task'}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono text-slate-500 bg-slate-50 border border-slate-200">
                    Difficulty: {q.difficulty || 'Medium'}
                  </span>
                </div>

                <button
                  onClick={() => toggleFlag(q.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    isCurrentFlagged
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                  title="Bookmark question to review before submission (Alt+F)"
                >
                  <Flag className={`w-3.5 h-3.5 ${isCurrentFlagged ? 'fill-amber-600 text-amber-600' : ''}`} />
                  <span>{isCurrentFlagged ? 'Flagged' : 'Flag for Review'}</span>
                  <span className="text-[10px] text-slate-400 hidden sm:inline">(Alt+F)</span>
                </button>
              </div>

              {/* Question Text */}
              <div className="text-base sm:text-lg font-semibold text-slate-900 leading-relaxed mb-4">
                <span className="text-blue-600 font-mono font-bold mr-2">Q{current + 1}.</span>
                {questionMainText}
              </div>

              {/* Code Snippet Container */}
              {questionCodeSnippet && (
                <CodeBlock code={questionCodeSnippet} language="python" />
              )}

              {/* MCQ Options */}
              {q.type === 'mcq' && q.options && (
                <div className="space-y-2.5 mt-6">
                  {Object.entries(q.options).map(([key, val]) => {
                    const isSelected = currentAnswer === key
                    return (
                      <button
                        key={key}
                        onClick={() => saveAnswer(q.id, key)}
                        type="button"
                        className={`w-full text-left p-4 rounded-xl border transition-all duration-150 flex items-start gap-3.5 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 border-2 border-blue-600 text-blue-950 font-medium shadow-xs'
                            : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 text-slate-800'
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}
                        >
                          {key.toUpperCase()}
                        </span>
                        <div className="flex-1 text-sm pt-0.5 leading-relaxed font-mono">
                          {val}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Short Answer Input */}
              {q.type === 'short' && (
                <div className="mt-6 space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Your Solution
                  </label>
                  <input
                    type="text"
                    value={currentAnswer}
                    onChange={e => saveAnswer(q.id, e.target.value)}
                    placeholder="Type your exact Python expression or answer..."
                    className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 placeholder:text-slate-400 outline-none text-sm font-mono transition-all"
                  />
                  <p className="text-[11px] text-slate-500">
                    Tip: Evaluated for exact syntax, standard aliases, and concept precision.
                  </p>
                </div>
              )}

              {/* Code Editor Area */}
              {q.type === 'code' && (
                <div className="mt-6 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="flex items-center gap-1.5 font-mono">
                      <Code2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Python Code Editor (Tab inserts 4 spaces)</span>
                    </span>
                  </div>
                  <textarea
                    value={currentAnswer}
                    onChange={e => saveAnswer(q.id, e.target.value)}
                    onKeyDown={e => handleCodeKeyDown(e, q.id)}
                    placeholder="# Write your Python implementation here..."
                    rows={8}
                    className="w-full p-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 text-emerald-400 font-mono text-sm leading-relaxed outline-none resize-y transition-all"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Bottom Action / Navigation Bar */}
          <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              onClick={() => setCurrent(c => Math.max(0, c - 1))}
              disabled={current === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
              <span className="text-[10px] text-slate-400 hidden sm:inline">(Alt+P)</span>
            </button>

            <div className="text-xs font-mono font-medium text-slate-500">
              {current + 1} / {total}
            </div>

            {current === total - 1 ? (
              <button
                onClick={() => setShowConfirm(true)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
              >
                <span>Review & Submit</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => setCurrent(c => Math.min(total - 1, c + 1))}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-colors cursor-pointer"
              >
                <span>Next</span>
                <span className="text-[10px] text-blue-100 hidden sm:inline">(Alt+N)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
