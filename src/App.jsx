import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Landing from './pages/Landing'
import Quiz from './pages/Quiz'
import Result from './pages/Result'
import Submitted from './pages/Submitted'
import Admin from './pages/Admin'
import AdminResult from './pages/AdminResult'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">
      <Toaster
        position="top-right"
        toastOptions={{
          className: '!bg-white !text-slate-900 !border !border-slate-200 !text-xs !font-semibold !rounded-xl !shadow-lg',
          duration: 3500,
          style: {
            background: '#ffffff',
            color: '#0f172a',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/result" element={<Result />} />
        <Route path="/result/:sessionId" element={<Result />} />
        <Route path="/submitted" element={<Submitted />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/result/:sessionId" element={<AdminResult />} />
      </Routes>
    </div>
  )
}
