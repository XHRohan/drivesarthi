'use client'

import { ROADS, CONGESTION_LEVELS } from '@/lib/trafficQueries'

const INPUT_CLS =
  'rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 ' +
  'px-3 py-1.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'

/**
 * TrafficFilters — shared filter bar used by Dashboard and Analytics.
 *
 * Props:
 *   filters         { roadId, dateFrom, dateTo, congestionLevel }
 *   onChange(patch) — called with partial update object
 *   showCongestion  (bool) — show congestion-level filter (Analytics only)
 *   compact         (bool) — smaller layout for dashboard header
 */
export default function TrafficFilters({
  filters,
  onChange,
  showCongestion = false,
  compact = false,
}) {
  function set(key) {
    return e => onChange({ [key]: e.target.value })
  }

  // Quick-range presets
  function applyPreset(days) {
    const to   = new Date()
    const from = new Date()
    from.setDate(from.getDate() - days)
    onChange({
      dateFrom: from.toISOString().slice(0, 10),
      dateTo:   to.toISOString().slice(0, 10),
    })
  }

  return (
    <div className={`flex flex-wrap items-end gap-3 ${compact ? '' : 'p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900'}`}>
      {/* Road selector */}
      <div className="flex flex-col gap-1 min-w-[140px]">
        {!compact && <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Road</label>}
        <select value={filters.roadId} onChange={set('roadId')} className={INPUT_CLS}>
          <option value="all">All Roads</option>
          {ROADS.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      {/* Date from */}
      <div className="flex flex-col gap-1">
        {!compact && <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">From</label>}
        <input
          type="date"
          value={filters.dateFrom}
          onChange={set('dateFrom')}
          className={INPUT_CLS}
        />
      </div>

      {/* Date to */}
      <div className="flex flex-col gap-1">
        {!compact && <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">To</label>}
        <input
          type="date"
          value={filters.dateTo}
          onChange={set('dateTo')}
          className={INPUT_CLS}
        />
      </div>

      {/* Congestion level (analytics only) */}
      {showCongestion && (
        <div className="flex flex-col gap-1 min-w-[140px]">
          {!compact && <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Congestion</label>}
          <select value={filters.congestionLevel} onChange={set('congestionLevel')} className={INPUT_CLS}>
            <option value="all">All Levels</option>
            {CONGESTION_LEVELS.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      )}

      {/* Quick presets */}
      {!compact && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Quick range</label>
          <div className="flex gap-1.5">
            {[
              { label: '7d',  days: 7  },
              { label: '14d', days: 14 },
              { label: '30d', days: 30 },
            ].map(p => (
              <button
                key={p.days}
                onClick={() => applyPreset(p.days)}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Clear filters */}
      <button
        onClick={() => onChange({ roadId: 'all', dateFrom: '', dateTo: '', congestionLevel: 'all' })}
        className="self-end px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        Clear
      </button>
    </div>
  )
}
