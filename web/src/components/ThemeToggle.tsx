import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDesktop, faMoon, faSun } from '@fortawesome/free-solid-svg-icons'
import { useTheme, type Theme } from '../contexts/ThemeContext'

const themeCycle: Theme[] = ['system', 'light', 'dark']

const themeMeta: Record<Theme, { label: string; nextLabel: string; icon: typeof faDesktop }> = {
  light: { label: '浅色', nextLabel: '深色', icon: faSun },
  dark: { label: '深色', nextLabel: '跟随系统', icon: faMoon },
  system: { label: '跟随系统', nextLabel: '浅色', icon: faDesktop },
}

const getNextTheme = (theme: Theme) => {
  const index = themeCycle.indexOf(theme)
  return themeCycle[(index + 1) % themeCycle.length]
}

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme()
  const current = themeMeta[theme]
  const next = themeMeta[getNextTheme(theme)]

  return (
    <button
      className="theme-toggle-button chassis-icon-button"
      onClick={() => setTheme(getNextTheme(theme))}
      aria-label={`当前主题：${current.label}，点击切换到${next.label}`}
      title={`当前：${current.label}，点击切换到${next.label}`}
    >
      <span className="theme-toggle-button__icon">
        <FontAwesomeIcon icon={current.icon} />
      </span>
    </button>
  )
}

export default ThemeToggle
