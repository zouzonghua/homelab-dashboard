import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDesktop, faMoon, faSun } from '@fortawesome/free-solid-svg-icons'
import { useTheme, type Theme } from './theme'

const themeCycle: Theme[] = ['system', 'light', 'dark']

const themeMeta: Record<Theme, { label: string; nextLabel: string; icon: typeof faDesktop }> = {
  light: { label: 'Light', nextLabel: 'Dark', icon: faSun },
  dark: { label: 'Dark', nextLabel: 'System', icon: faMoon },
  system: { label: 'System', nextLabel: 'Light', icon: faDesktop },
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
      aria-label={`Current theme: ${current.label}. Click to switch to ${next.label}`}
      title={`Current: ${current.label}. Click to switch to ${next.label}`}
    >
      <span className="theme-toggle-button__icon">
        <FontAwesomeIcon icon={current.icon} />
      </span>
    </button>
  )
}

export default ThemeToggle
