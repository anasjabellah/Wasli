export type IconName =
  | 'overview'
  | 'pickups'
  | 'students'
  | 'parents'
  | 'teachers'
  | 'classes'
  | 'schedules'
  | 'history'
  | 'reports'
  | 'settings'
  | 'logout'
  | 'menu'
  | 'close'
  | 'bell'
  | 'search'
  | 'calendar';

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };
  if (name === 'overview') {
    return (
      <svg {...props}>
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    );
  }
  if (name === 'pickups') {
    return (
      <svg {...props}>
        <path d="M4 7h16M4 12h16M4 17h10" />
      </svg>
    );
  }
  if (name === 'students' || name === 'parents' || name === 'teachers') {
    return (
      <svg {...props}>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 19c1.2-3 3.4-4.5 7-4.5S17.8 16 19 19" />
      </svg>
    );
  }
  if (name === 'classes') {
    return (
      <svg {...props}>
        <path d="M4 19V6.5L12 3l8 3.5V19" />
        <path d="M9 19v-5h6v5" />
      </svg>
    );
  }
  if (name === 'schedules' || name === 'calendar') {
    return (
      <svg {...props}>
        <rect x="3.5" y="5" width="17" height="15" rx="2" />
        <path d="M8 3.5V7M16 3.5V7M3.5 10h17" />
      </svg>
    );
  }
  if (name === 'history') {
    return (
      <svg {...props}>
        <path d="M4 12a8 8 0 1 0 2.2-5.5" />
        <path d="M4 4v4h4M12 8v5l3 2" />
      </svg>
    );
  }
  if (name === 'reports') {
    return (
      <svg {...props}>
        <path d="M4 19V10M10 19V5M16 19v-7M22 19H2" />
      </svg>
    );
  }
  if (name === 'settings') {
    return (
      <svg {...props}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.5 1.5M16.5 16.5 18 18M18 6l-1.5 1.5M7.5 16.5 6 18" />
      </svg>
    );
  }
  if (name === 'logout') {
    return (
      <svg {...props}>
        <path d="M9 6H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3M14 16l4-4-4-4M9 12h9" />
      </svg>
    );
  }
  if (name === 'menu') {
    return (
      <svg {...props}>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    );
  }
  if (name === 'close') {
    return (
      <svg {...props}>
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    );
  }
  if (name === 'bell') {
    return (
      <svg {...props}>
        <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5L6 16" />
        <path d="M10 19a2 2 0 0 0 4 0" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16l4 4" />
    </svg>
  );
}
