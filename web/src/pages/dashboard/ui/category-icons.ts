import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  faBook,
  faCloud,
  faCode,
  faCog,
  faDatabase,
  faFolder,
  faGamepad,
  faGlobe,
  faHome,
  faImage,
  faMusic,
  faNetworkWired,
  faPhotoFilm,
  faServer,
  faStream,
  faTerminal,
  faVideo,
  faWifi,
} from '@fortawesome/free-solid-svg-icons'

export type CategoryIconOption = {
  value: string
  label: string
  icon: IconDefinition
}

export const categoryIconOptions: CategoryIconOption[] = [
  { value: 'fa-solid fa-folder', label: 'Default', icon: faFolder },
  { value: 'fa-solid fa-home', label: 'Home', icon: faHome },
  { value: 'fa-solid fa-server', label: 'Server', icon: faServer },
  { value: 'fa-solid fa-network-wired', label: 'Network', icon: faNetworkWired },
  { value: 'fa-solid fa-wifi', label: 'Wi-Fi', icon: faWifi },
  { value: 'fa-solid fa-database', label: 'Database', icon: faDatabase },
  { value: 'fa-solid fa-cloud', label: 'Cloud', icon: faCloud },
  { value: 'fa-solid fa-globe', label: 'Site', icon: faGlobe },
  { value: 'fa-solid fa-photo-film', label: 'Media', icon: faPhotoFilm },
  { value: 'fa-solid fa-video', label: 'Video', icon: faVideo },
  { value: 'fa-solid fa-music', label: 'Music', icon: faMusic },
  { value: 'fa-solid fa-image', label: 'Image', icon: faImage },
  { value: 'fa-solid fa-stream', label: 'Service', icon: faStream },
  { value: 'fa-solid fa-cog', label: 'System', icon: faCog },
  { value: 'fa-solid fa-code', label: 'Development', icon: faCode },
  { value: 'fa-solid fa-terminal', label: 'Terminal', icon: faTerminal },
  { value: 'fa-solid fa-gamepad', label: 'Entertainment', icon: faGamepad },
  { value: 'fa-solid fa-book', label: 'Docs', icon: faBook },
]

export const getCategoryIcon = (value?: string) =>
  categoryIconOptions.find((option) => option.value === value)?.icon ?? faFolder
