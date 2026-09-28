import NavIcon from '@/components/ui/NavIcon'

const ACCENT = {
  blue:   { ring: 'bg-blue-100 dark:bg-blue-900/20',   icon: 'text-blue-600 dark:text-blue-400',   badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  green:  { ring: 'bg-green-100 dark:bg-green-900/20', icon: 'text-green-600 dark:text-green-400', badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  red:    { ring: 'bg-red-100 dark:bg-red-900/20',     icon: 'text-red-600 dark:text-red-400',     badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  orange: { ring: 'bg-orange-100 dark:bg-orange-900/20', icon: 'text-orange-600 dark:text-orange-400', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  purple: { ring: 'bg-purple-100 dark:bg-purple-900/20', icon: 'text-purple-600 dark:text-purple-400', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  yellow: { ring: 'bg-yellow-100 dark:bg-yellow-900/20', icon: 'text-yellow-600 dark:text-yellow-400', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
}

/**
 * PlaceholderPage — generic "coming soon" page shell.
 * Used by all module pages that are not yet implemented.
 *
 * Props:
 *   icon         (string)   — NavIcon name
 *   title        (string)   — page heading
 *   description  (string)   — one-sentence module description
 *   statusItems  (string[]) — bullet list of planned features
 *   comingSoon   (bool)     — shows "Coming Soon" badge when true
 *   accentColor  (string)   — 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'yellow'
 */
export default function PlaceholderPage({
  icon = 'dashboard',
  title,
  description,
  statusItems = [],
  comingSoon = false,
  accentColor = 'blue',
}) {
  const accent = ACCENT[accentColor] ?? ACCENT.blue

  return (
    <div className="max-w-lg mx-auto space-y-6 py-4">
      {/* Icon + title */}
      <div className="flex items-start gap-4">
        <div className={`w-14 h-14 rounded-2xl ${accent.ring} flex items-center justify-center shrink-0`}>
          <span className={accent.icon}>
            <NavIcon name={icon} className="w-7 h-7" />
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">{title}</h1>
            {comingSoon && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${accent.badge}`}>
                Coming Soon
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {/* Planned features */}
      {statusItems.length > 0 && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Planned Features</h2>
          <ul className="space-y-2">
            {statusItems.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <span className="mt-0.5 text-zinc-300 dark:text-zinc-600 shrink-0">—</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Status notice */}
      <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 px-5 py-4 text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          This module is not yet implemented.
          Check <span className="font-medium text-zinc-700 dark:text-zinc-300">DEVELOPMENT_STATUS.md</span> for the build roadmap.
        </p>
      </div>
    </div>
  )
}
