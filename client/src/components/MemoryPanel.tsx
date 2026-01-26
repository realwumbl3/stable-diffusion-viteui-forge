import { useState, useEffect, useCallback } from 'react'
import { X, RefreshCw, Clipboard } from 'lucide-react'
import { memoryDebug } from '../lib/memory-debug'

interface MemoryPanelProps {
  open: boolean
  onClose: () => void
}

function formatSnapshotForClipboard(snap: ReturnType<typeof memoryDebug.getMemorySnapshot>): string {
  const lines: string[] = ['Memory usage', new Date().toISOString(), '---']
  const { heap, entries, canvases } = snap
  if (heap) {
    lines.push(`Heap: ${heap.usedMB.toFixed(1)} MB / ${heap.totalMB.toFixed(1)} MB (${heap.percent.toFixed(1)}% of ${heap.limitMB.toFixed(0)} MB limit)`)
  } else {
    lines.push('Heap: — (Chrome performance.memory required)')
  }
  lines.push('---')
  entries.forEach(({ label, value }) => { lines.push(`${label}: ${value}`) })
  if (canvases.length > 0) {
    lines.push('---', 'Per canvas:')
    canvases.forEach((c) => { lines.push(`  ${c.width}×${c.height}: ${c.mb.toFixed(1)} MB`) })
  }
  return lines.join('\n')
}

const MemoryPanel = ({ open, onClose }: MemoryPanelProps) => {
  const [snapshot, setSnapshot] = useState(memoryDebug.getMemorySnapshot())
  const [copied, setCopied] = useState(false)
  const refresh = useCallback(() => setSnapshot(memoryDebug.getMemorySnapshot()), [])

  const copyToClipboard = useCallback(() => {
    const text = formatSnapshotForClipboard(snapshot)
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [snapshot])

  useEffect(() => {
    if (!open) return
    refresh()
    const id = setInterval(refresh, 3000)
    return () => clearInterval(id)
  }, [open, refresh])

  if (!open) return null

  const { heap, entries, canvases } = snapshot

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="fixed bottom-12 right-4 z-50 w-80 bg-studio-panel border border-studio-border rounded-lg shadow-studio-lg overflow-hidden"
        role="dialog"
        aria-labelledby="memory-panel-title"
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-studio-border">
          <h2 id="memory-panel-title" className="text-sm font-semibold text-studio-text">
            Memory usage
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={copyToClipboard}
              className="p-1 text-studio-textSecondary hover:text-studio-text rounded transition-colors"
              title={copied ? 'Copied!' : 'Copy to clipboard'}
            >
              <Clipboard size={14} className={copied ? 'text-studio-success' : undefined} />
            </button>
            <button
              type="button"
              onClick={refresh}
              className="p-1 text-studio-textSecondary hover:text-studio-text rounded transition-colors"
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-studio-textSecondary hover:text-studio-text rounded transition-colors"
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="p-3 space-y-3 max-h-[70vh] overflow-y-auto">
          {/* Heap (Chrome-only) */}
          {heap ? (
            <div className="space-y-1">
              <div className="text-xs font-medium text-studio-textSecondary uppercase tracking-wider">
                Heap
              </div>
              <div className="text-sm text-studio-text">
                <span className={heap.percent > 80 ? 'text-studio-error' : heap.percent > 60 ? 'text-studio-warning' : ''}>
                  {heap.usedMB.toFixed(1)} MB
                </span>
                {' / '}
                {heap.totalMB.toFixed(1)} MB
                <span className="text-studio-textMuted"> (limit {heap.limitMB.toFixed(0)} MB)</span>
              </div>
              <div className="h-1.5 bg-studio-surface rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    heap.percent > 80 ? 'bg-studio-error' : heap.percent > 60 ? 'bg-studio-warning' : 'bg-studio-accent'
                  }`}
                  style={{ width: `${Math.min(heap.percent, 100)}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="text-xs text-studio-textMuted">Heap stats require Chrome (performance.memory).</div>
          )}

          {/* Calculable metrics: label left, value right */}
          <div className="space-y-1">
            <div className="text-xs font-medium text-studio-textSecondary uppercase tracking-wider">
              Memory usage
            </div>
            <ul className="space-y-1">
              {entries.map(({ label, value }) => (
                <li key={label} className="flex justify-between items-baseline gap-3 text-xs">
                  <span className="text-studio-textSecondary truncate">{label}</span>
                  <span className="text-studio-text font-mono tabular-nums shrink-0">{value}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Per-canvas: label (W×H) left, value (MB) right */}
          {canvases.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-studio-textSecondary uppercase tracking-wider">
                Per canvas
              </div>
              <ul className="space-y-1 max-h-20 overflow-y-auto">
                {canvases.map((c, i) => (
                  <li key={i} className="flex justify-between items-baseline gap-3 text-xs">
                    <span className="text-studio-textSecondary">{c.width}×{c.height}</span>
                    <span className="text-studio-text font-mono tabular-nums shrink-0">{c.mb.toFixed(1)} MB</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default MemoryPanel
