import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BASE_URL } from '../constants'

const TOPIC_ICONS = {
  1: '🔤', 2: '📦', 3: '🧩', 4: '🔄', 5: '✏️', 6: '🛠️', 7: '🎨', 8: '➕',
  9: '⚖️', 10: '🔀', 11: '📋', 12: '🔒', 13: '🎯', 14: '🗝️', 15: '🔁', 16: '⏳', 17: '📊', 18: '🚀'
}

export default function Home() {
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${BASE_URL}/api/topics`)
      .then(r => r.json())
      .then(data => { setTopics(data.topics); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-primary text-white py-8 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-2 font-heading">
          Python Basics Exam
        </h1>
        <p className="text-lg opacity-90 max-w-xl mx-auto font-body">
          Test your knowledge across 18 Python topics with MCQs, short answers, and code challenges
        </p>
      </header>

      {/* Topics Grid */}
      <main className="max-w-5xl mx-auto px-4 py-10">
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-ink/60 font-body">Loading topics...</p>
          </div>
        ) : topics.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-border shadow-sm">
            <p className="text-xl text-ink/50 font-body">
              Cannot connect to backend. Make sure the FastAPI server is running.
            </p>
            <p className="mt-2 text-sm text-ink/40 font-body">
              Run: <code className="bg-muted px-2 py-1 rounded">cd server && uvicorn main:app --reload</code>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {topics.map(topic => (
              <Link
                key={topic.id}
                to={`/quiz/${topic.id}`}
                className="group block bg-white rounded-2xl border border-border p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="text-3xl mb-3">{TOPIC_ICONS[topic.id] || '📘'}</div>
                <h3 className="text-lg font-bold text-ink font-heading group-hover:text-primary transition-colors">
                  {topic.name}
                </h3>
                <p className="mt-2 text-sm text-ink/50 font-body">
                  3 questions (MCQ + Short + Code)
                </p>
                <div className="mt-4 text-sm font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Start Quiz →
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-ink/40 text-sm font-body border-t border-border">
        Powered by Google Gemini AI for smart evaluation
      </footer>
    </div>
  )
}
