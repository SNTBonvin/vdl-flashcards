/**
 * Jeu d'icônes maison — trait fin (1.8px), sans remplissage, sans emoji.
 * Chaque tracé est dessiné dans une grille de 24×24.
 */

export type IconName =
  | 'today'
  | 'library'
  | 'review'
  | 'settings'
  | 'plus'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevron-down'
  | 'close'
  | 'edit'
  | 'trash'
  | 'download'
  | 'upload'
  | 'bell'
  | 'bell-off'
  | 'search'
  | 'check'
  | 'reset'
  | 'shuffle'
  | 'layers'
  | 'card'
  | 'inbox'
  | 'flip'
  | 'flag'
  | 'clock'
  | 'chart'
  | 'pause'
  | 'play'
  | 'info'
  | 'sparkle'
  | 'folder'
  | 'move'

const PATHS: Record<IconName, string> = {
  today: 'M7 3v3M17 3v3M4 8.5h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1ZM9 14l2 2 4-4',
  library: 'M4 6.5h6.5v11H4zM13.5 6.5H20v11h-6.5zM4 6.5V4.8M20 6.5V4.8M4 17.5v1.7M20 17.5v1.7',
  review: 'M12 4.5a7.5 7.5 0 1 1-7.1 5.1M4.9 4.6v5h5',
  settings: 'M5 7h14M5 12h14M5 17h14M9 7v0M15 12v0M11 17v0',
  plus: 'M12 5.5v13M5.5 12h13',
  'chevron-right': 'm9.5 5.5 6.5 6.5-6.5 6.5',
  'chevron-left': 'M14.5 5.5 8 12l6.5 6.5',
  'chevron-down': 'm5.5 9.5 6.5 6.5 6.5-6.5',
  close: 'M6 6l12 12M18 6 6 18',
  edit: 'M4.5 19.5h4l10-10a2.1 2.1 0 0 0-3-3l-10 10zM14.5 7.5l2 2',
  trash: 'M4.5 6.5h15M9.5 6.5V4.8h5v1.7M7 6.5l.8 12.2a1 1 0 0 0 1 .8h6.4a1 1 0 0 0 1-.8L17 6.5M10.5 10v6M13.5 10v6',
  download: 'M12 4v11M7.5 10.5 12 15l4.5-4.5M4.5 19.5h15',
  upload: 'M12 15.5V4.5M7.5 9 12 4.5 16.5 9M4.5 19.5h15',
  bell: 'M6.5 17.5V11a5.5 5.5 0 0 1 11 0v6.5M4.5 17.5h15M10 20.5a2.2 2.2 0 0 0 4 0',
  'bell-off': 'M6.5 17.5V11a5.5 5.5 0 0 1 7.6-5.1M17.5 12.5v5M4.5 17.5h15M10 20.5a2.2 2.2 0 0 0 4 0M4 4l16 16',
  search: 'M10.8 17.6a6.8 6.8 0 1 0 0-13.6 6.8 6.8 0 0 0 0 13.6ZM15.8 15.8 20 20',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  reset: 'M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 5v4h4',
  shuffle: 'M3.5 6.5h3l9 11h4M3.5 17.5h3l3-3.6M15 6.5h5.5M17.5 4l3 2.5-3 2.5M17.5 15l3 2.5-3 2.5',
  layers: 'm12 3.5 8 4.5-8 4.5-8-4.5 8-4.5ZM4 12.5l8 4.5 8-4.5M4 16.5l8 4.5 8-4.5',
  card: 'M4 6.5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1ZM12 6.5v11',
  inbox: 'M4 13.5h4l1.2 2.4h5.6L16 13.5h4M5.6 5.5h12.8l2.1 8.2v4.3a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1v-4.3z',
  flip: 'M4 8.5h11.5a4 4 0 0 1 0 8H12M7 5.5 4 8.5l3 3M20 15.5h-3.5',
  flag: 'M6 20.5V4.5M6 5.5h11l-2.2 3.6L17 12.7H6',
  clock: 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM12 7.5V12l3 2',
  chart: 'M4 19.5h16M7.5 16.5V11M12 16.5V6.5M16.5 16.5v-7',
  pause: 'M9.5 5.5v13M14.5 5.5v13',
  play: 'M7.5 5.2v13.6L19 12z',
  info: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17ZM12 11v5.5M12 7.8v.4',
  sparkle: 'm12 4 1.9 4.9L19 10.8l-5.1 1.9L12 17.6l-1.9-4.9L5 10.8l5.1-1.9zM18 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z',
  folder: 'M3.5 6.8a1 1 0 0 1 1-1h4.2l1.8 2.2h8a1 1 0 0 1 1 1v9.2a1 1 0 0 1-1 1h-14a1 1 0 0 1-1-1z',
  move: 'M4 8.5h9M4 12.5h6M4 16.5h9M14.5 12.5H21M17.8 9.2l3.2 3.3-3.2 3.3',
}

interface Props {
  name: IconName
  size?: number
  className?: string
  strokeWidth?: number
}

export function Icon({ name, size = 20, className, strokeWidth = 1.8 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
