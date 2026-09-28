'use client'

import { useState, useRef } from 'react'
import { analyzeImage } from '@/lib/api'

// ── congestion colour helpers ─────────────────────────────────────────────────
const CONGESTION_STYLE = {
  Low:        { badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',  bar: 'bg-green-500'  },
  Moderate:   { badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', bar: 'bg-yellow-500' },
  High:       { badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300', bar: 'bg-orange-500' },
  'Very High':{ badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',          bar: 'bg-red-600'    },
}

const VEHICLE_ROWS = [
  { key: 'cars',   label: 'Cars',   emoji: '🚗', colour: '#3b82f6' },
  { key: 'bikes',  label: 'Bikes',  emoji: '🏍️', colour: '#10b981' },
  { key: 'buses',  label: 'Buses',  emoji: '🚌', colour: '#8b5cf6' },
  { key: 'trucks', label: 'Trucks', emoji: '🚛', colour: '#ef4444' },
  { key: 'other_vehicles', label: 'Other', emoji: '🚐', colour: '#6b7280' },
]

const MAX_MB = 20

export default function AnalyzerPage() {
  const [imageFile, setImageFile]   = useState(null)
  const [preview, setPreview]       = useState(null)
  const [result, setResult]         = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [backendDown, setBackendDown] = useState(false)
  const fileRef = useRef()

  function handleFile(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPEG, PNG, or WebP).')
      return
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`Image must be under ${MAX_MB} MB.`)
      return
    }
    setError(null)
    setResult(null)
    setBackendDown(false)
    setImageFile(file)
    setPreview(URL.createObjectURL(file))
  }

  function handleDrop(e) {
    e.preventDefault()
    handleFile(e.dataTransfer.files?.[0])
  }

  async function handleAnalyze() {
    if (!imageFile) return
    setLoading(true)
    setError(null)
    setResult(null)
    setBackendDown(false)
    try {
      const data = await analyzeImage(imageFile)
      setResult(data)
    } catch (err) {
      // Distinguish "backend not running" from a real error
      if (err.message.includes('Failed to fetch') || err.message.includes('ERR_CONNECTION_REFUSED')) {
        setBackendDown(true)
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setImageFile(null)
    setPreview(null)
    setResult(null)
    setError(null)
    setBackendDown(false)
  }

  const congestionStyle = result ? (CONGESTION_STYLE[result.congestion_level] ?? CONGESTION_STYLE['Low']) : null

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">AI Traffic Analyzer</h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Upload a road or traffic camera image. YOLOv8 detects vehicles and estimates traffic conditions.
          <span className="ml-1 font-medium text-zinc-600 dark:text-zinc-300">
            This is a prototype — results are indicative only.
          </span>
        </p>
      </div>

      {/* Backend-down warning */}
      {backendDown && (
        <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 px-4 py-3 space-y-1">
          <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">FastAPI backend is not running</p>
          <p className="text-xs text-orange-600 dark:text-orange-400">
            Start it from the project root:
          </p>
          <pre className="text-xs bg-orange-100 dark:bg-orange-900/40 rounded p-2 overflow-x-auto text-orange-800 dark:text-orange-200">
{`# Activate venv (first time: python -m venv backend/.venv)
backend\\.venv\\Scripts\\activate

# Install deps (first time only)
pip install -r backend/requirements.txt

# Start server
uvicorn backend.main:app --reload --port 8000`}
          </pre>
        </div>
      )}

      {/* Upload area */}
      {!preview && (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900/50 p-12 cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
        >
          <span className="text-4xl">📸</span>
          <div className="text-center">
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Drop a traffic image here or click to upload
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
              JPEG, PNG, WebP — max {MAX_MB} MB
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={e => handleFile(e.target.files?.[0])}
          />
        </div>
      )}

      {/* Preview + analyse */}
      {preview && !result && (
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-sm">
            <img
              src={preview}
              alt="Uploaded traffic image"
              className="w-full max-h-80 object-contain bg-zinc-100 dark:bg-zinc-800"
            />
            <button
              onClick={reset}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white text-sm flex items-center justify-center hover:bg-black/80 transition-colors"
              aria-label="Remove image"
            >
              ×
            </button>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-4 py-3 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Analysing with YOLO…
              </>
            ) : (
              '🔍 Analyse Image'
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Original image thumbnail */}
          {preview && (
            <div className="flex items-center gap-3">
              <img
                src={preview}
                alt="Analysed"
                className="w-20 h-14 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-800 dark:text-white truncate">{imageFile?.name}</p>
                <p className="text-xs text-zinc-400">{(imageFile?.size / 1024).toFixed(0)} KB · {imageFile?.type}</p>
              </div>
              <button
                onClick={reset}
                className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-600 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
              >
                New Image
              </button>
            </div>
          )}

          {/* Congestion summary bar */}
          <div className={`rounded-xl border px-5 py-4 flex items-center justify-between gap-4 flex-wrap
            ${result.congestion_level === 'Very High'
              ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
              : result.congestion_level === 'High'
              ? 'border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20'
              : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900'
            }`}
          >
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Congestion Level</p>
              <span className={`text-base font-bold px-3 py-1 rounded-full ${congestionStyle.badge}`}>
                {result.congestion_level}
              </span>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Density</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{result.density_percent}%</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Avg Speed</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{result.avg_speed_kmh} km/h</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Est. Clearance</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{result.estimated_clearance_minutes} min</p>
            </div>
          </div>

          {/* Density bar */}
          <div>
            <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
              <span>Traffic Density</span>
              <span>{result.density_percent}% of reference capacity</span>
            </div>
            <div className="w-full h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${congestionStyle.bar}`}
                style={{ width: `${Math.min(result.density_percent, 100)}%` }}
              />
            </div>
          </div>

          {/* Vehicle counts */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Vehicle Breakdown</p>
              <p className="text-xs font-bold text-zinc-900 dark:text-white">
                Total: {result.total_vehicles}
              </p>
            </div>

            {VEHICLE_ROWS.map(({ key, label, emoji }) => {
              const count = result[key] ?? 0
              const pct   = result.total_vehicles > 0
                ? Math.round((count / result.total_vehicles) * 100)
                : 0
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-base w-7 shrink-0">{emoji}</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 w-14 shrink-0">{label}</span>
                  <div className="flex-1 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-zinc-800 dark:text-white w-6 text-right shrink-0">{count}</span>
                  <span className="text-xs text-zinc-400 w-8 shrink-0">{pct}%</span>
                </div>
              )
            })}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile label="Total Vehicles"  value={result.total_vehicles} />
            <StatTile label="Density"         value={`${result.density_percent}%`} />
            <StatTile label="Avg Speed"       value={`${result.avg_speed_kmh} km/h`} />
            <StatTile label="Clearance Est."  value={`${result.estimated_clearance_minutes} min`} />
          </div>

          {/* Disclaimer */}
          <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 px-4 py-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              <strong className="text-zinc-600 dark:text-zinc-300">Note:</strong> {result.note}
            </p>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 space-y-2">
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">How It Works</p>
        <ol className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400 list-decimal list-inside">
          <li>Upload a JPEG/PNG road or traffic camera image</li>
          <li>Image is sent to the local FastAPI backend (port 8000)</li>
          <li>YOLOv8n (COCO pretrained) detects cars, bikes, buses, trucks</li>
          <li>Density is computed as detected vehicles ÷ reference capacity (100)</li>
          <li>Congestion level and clearance time are estimated from density</li>
          <li>Results are returned as JSON and displayed here</li>
        </ol>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 pt-1">
          The synthetic traffic CSV dataset is used for historical analytics and dashboard trends — it is not replaced by YOLO output.
        </p>
      </div>
    </div>
  )
}

// ── helper ────────────────────────────────────────────────────────────────────
function StatTile({ label, value }) {
  return (
    <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-3 text-center">
      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="text-base font-bold text-zinc-900 dark:text-white mt-0.5">{value}</p>
    </div>
  )
}
