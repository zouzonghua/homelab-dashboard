import PropTypes from 'prop-types'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faEdit, faCheck } from "@fortawesome/free-solid-svg-icons";
// import Avatar from '@/assets/icons/Avatar.jpg'
import ThemeToggle from './ThemeToggle'
import ConfigTools from './ConfigTools'

const  Avatar = 'https://avatars.githubusercontent.com/u/53508103?v=4'

const getStableHash = (value) =>
  Array.from(value || '').reduce((hash, char) => {
    const nextHash = ((hash << 5) - hash) + char.charCodeAt(0)
    return nextHash >>> 0
  }, 0)

const getCategoryLed = (category, serviceStatus) => {
  const monitored = category.list.filter((service) => service.monitorEnabled)
  if (monitored.length === 0) {
    return {
      className: 'status-port-pending',
      title: `${category.name} · 未启用检测`,
    }
  }

  const counts = monitored.reduce((nextCounts, service) => {
    const status = serviceStatus?.[service.name]?.status
    if (status === 'up') {
      nextCounts.up += 1
    } else if (status === 'down') {
      nextCounts.down += 1
    } else {
      nextCounts.pending += 1
    }
    return nextCounts
  }, { up: 0, down: 0, pending: 0 })

  const className = counts.down > 0
    ? 'status-port-down'
    : counts.pending > 0
      ? 'status-port-warning'
      : 'status-online'

  return {
    className,
    title: `${category.name} · ${counts.up} up / ${counts.down} down / ${counts.pending} checking`,
  }
}

const getCategoryLedStyle = (category) => {
  const seed = getStableHash(category.name)
  return {
    '--status-delay': `${(seed % 151) / 100}s`,
    '--status-duration': `${1.24 + (seed % 49) / 100}s`,
    '--status-spark-delay': `${(seed % 211) / 100}s`,
    '--status-spark-duration': `${0.82 + (seed % 61) / 100}s`,
  }
}

const Header = ({
  title,
  onExportConfig,
  onImportConfig,
  onAddCategory,
  isEditMode,
  onToggleEditMode,
  categories = [],
  serviceStatus = {},
}) => {
  return (
    <div className="chassis-header head w-screen flex justify-center">
      <div className="chassis-header__container head__container max-w-screen-xl w-full py-3.5 h-24 flex">
        <div className="head__logo flex flex-none items-center">
          <a className="chassis-avatar" href="https://zouzonghua.cn/" tabIndex="0" aria-label="访问个人网站">
            <img className="h-12 w-12 md:h-14 md:w-14 rounded-full" src={Avatar} alt="logo" />
          </a>
        </div>
        <div className="chassis-title head__title flex flex-1 text-xl md:text-3xl items-center pl-4">
          <h1>{title}</h1>
        </div>
        <div className="flex items-center justify-end pr-4 space-x-4">
          <div className="chassis-header__leds hidden md:flex" aria-hidden="true">
            {categories.map((category) => {
              const led = getCategoryLed(category, serviceStatus)
              return (
                <span
                  key={category.name}
                  className={`status-port ${led.className}`}
                  style={getCategoryLedStyle(category)}
                  title={led.title}
                />
              )
            })}
          </div>
          <ConfigTools
            onExport={onExportConfig}
            onImport={onImportConfig}
          />

          {/* 编辑模式切换按钮 */}
          <button
            onClick={onToggleEditMode}
            className={`chassis-icon-button p-2 transition-all`}
            aria-label={isEditMode ? "退出编辑模式" : "进入编辑模式"}
            title={isEditMode ? "退出编辑模式" : "进入编辑模式"}
          >
            <FontAwesomeIcon
              icon={isEditMode ? faCheck : faEdit}
              className="text-xl"
            />
          </button>

          {/* 添加分类按钮 - 仅在编辑模式下显示 */}
          {isEditMode && (
            <button
              onClick={onAddCategory}
              className="chassis-icon-button p-2 transition-colors"
              aria-label="添加新分类"
              title="添加新分类"
            >
              <FontAwesomeIcon icon={faPlus} className="text-xl" />
            </button>
          )}

          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}

Header.propTypes = {
  title: PropTypes.string.isRequired,
  onExportConfig: PropTypes.func.isRequired,
  onImportConfig: PropTypes.func.isRequired,
  onAddCategory: PropTypes.func.isRequired,
  isEditMode: PropTypes.bool.isRequired,
  onToggleEditMode: PropTypes.func.isRequired,
  categories: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    list: PropTypes.array.isRequired,
  })),
  serviceStatus: PropTypes.object,
}

export default Header
