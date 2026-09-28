/**
 * Navigation items used by both Sidebar and mobile nav.
 * Single source of truth — update here when new routes are added.
 */
export const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'dashboard',
    description: 'Traffic overview & activity',
  },
  {
    label: 'Smart Signals',
    href: '/signal',
    icon: 'signal',
    description: 'Signal status & countdown',
  },
  {
    label: 'Traffic Analyzer',
    href: '/analyzer',
    icon: 'analyzer',
    description: 'AI vehicle detection',
  },
  {
    label: 'Nearby Parking',
    href: '/parking',
    icon: 'parking',
    description: 'Find available parking',
  },
  {
    label: 'Incidents',
    href: '/incidents',
    icon: 'incidents',
    description: 'Report road incidents',
  },
  {
    label: 'Emergency SOS',
    href: '/sos',
    icon: 'sos',
    description: 'Quick emergency contacts',
  },
  {
    label: 'Traffic Analytics',
    href: '/analytics',
    icon: 'analytics',
    description: 'Charts & trends',
  },
  {
    label: 'My Profile',
    href: '/profile',
    icon: 'profile',
    description: 'Account & settings',
  },
]
