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
  { value: 'fa-solid fa-folder', label: '默认', icon: faFolder },
  { value: 'fa-solid fa-home', label: '首页', icon: faHome },
  { value: 'fa-solid fa-server', label: '服务器', icon: faServer },
  { value: 'fa-solid fa-network-wired', label: '网络', icon: faNetworkWired },
  { value: 'fa-solid fa-wifi', label: '无线', icon: faWifi },
  { value: 'fa-solid fa-database', label: '数据库', icon: faDatabase },
  { value: 'fa-solid fa-cloud', label: '云服务', icon: faCloud },
  { value: 'fa-solid fa-globe', label: '站点', icon: faGlobe },
  { value: 'fa-solid fa-photo-film', label: '媒体', icon: faPhotoFilm },
  { value: 'fa-solid fa-video', label: '视频', icon: faVideo },
  { value: 'fa-solid fa-music', label: '音乐', icon: faMusic },
  { value: 'fa-solid fa-image', label: '图片', icon: faImage },
  { value: 'fa-solid fa-stream', label: '服务', icon: faStream },
  { value: 'fa-solid fa-cog', label: '系统', icon: faCog },
  { value: 'fa-solid fa-code', label: '开发', icon: faCode },
  { value: 'fa-solid fa-terminal', label: '终端', icon: faTerminal },
  { value: 'fa-solid fa-gamepad', label: '娱乐', icon: faGamepad },
  { value: 'fa-solid fa-book', label: '文档', icon: faBook },
]

export const getCategoryIcon = (value?: string) =>
  categoryIconOptions.find((option) => option.value === value)?.icon ?? faFolder
