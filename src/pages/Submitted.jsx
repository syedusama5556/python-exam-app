import { Link } from 'react-router-dom'
import { CheckCircle2, ArrowRight, Award, RotateCcw } from 'lucide-react'

export default function Submitted() {
  const sessionId = sessionStorage.getItem('sessionId') || localStorage.getItem('python_exam_session_id')

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4 selection:bg-blue-600 selection:text-white">
      <div className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-sm max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Exam Submitted Successfully
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your responses have been processed and graded by our multi-tier Python evaluation engine.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          {sessionId ? (
            <Link
              to={`/result/${sessionId}`}
              className="w-full py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs tracking-wide transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <Award className="w-4 h-4" />
              <span>View Performance Scorecard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : null}

          <Link
            to="/"
            className="w-full py-2.5 px-5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Return to Portal Home</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
