import { Toolbar } from '@base-ui/react/toolbar'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDesktop, faMoon, faSun } from '@fortawesome/free-solid-svg-icons'
import { useTheme, getNextTheme, type Theme } from './theme'

const themeMeta: Record<Theme, { label: string; nextLabel: string; icon: typeof faDesktop }> = {
  light: { label: 'Light', nextLabel: 'Dark', icon: faSun },
  dark: { label: 'Dark', nextLabel: 'System', icon: faMoon },
  system: { label: 'System', nextLabel: 'Light', icon: faDesktop },
}

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme()
  const current = themeMeta[theme]
  const next = themeMeta[getNextTheme(theme)]

  return (
    <Toolbar.Button
      className="theme-toggle-button chassis-icon-button"
      onClick={() => setTheme(getNextTheme(theme))}
      aria-label={`Current theme: ${current.label}. Click to switch to ${next.label}`}
      title={`Current: ${current.label}. Click to switch to ${next.label}`}
    >
      <span className="theme-toggle-button__icon">
        <FontAwesomeIcon icon={current.icon} />
      </span>
    </Toolbar.Button>
  )
}

export default ThemeToggle
