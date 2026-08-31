import React, { useEffect, useState } from 'react'
import Prism from 'prismjs'
import 'prismjs/components/prism-python'
import { Copy, Check } from 'lucide-react'

export default function CodeBlock({ code, language = 'python', showLineNumbers = true }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    Prism.highlightAll()
  }, [code])

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!code) return null

  const lines = code.trim().split('\n')

  return (
    <div className="relative rounded-lg overflow-hidden border border-slate-700 bg-slate-900 my-3">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950 border-b border-slate-800 text-xs text-slate-400 font-mono">
        <span className="text-slate-300 font-semibold">python</span>
        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center gap-1 text-slate-300 hover:text-white transition-colors cursor-pointer px-2 py-0.5 rounded hover:bg-slate-800"
          title="Copy code to clipboard"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span className="text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      <div className="p-4 overflow-x-auto font-mono text-sm leading-relaxed">
        <pre className="code-block flex">
          {showLineNumbers && (
            <div className="select-none pr-4 text-slate-600 text-right font-mono text-xs leading-relaxed">
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
          )}
          <code className={`language-${language} flex-1`}>
            {code.trim()}
          </code>
        </pre>
      </div>
    </div>
  )
}
