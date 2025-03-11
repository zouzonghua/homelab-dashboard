import PropTypes from 'prop-types'
import Avatar from '@/assets/icons/Avatar.jpg'
import ThemeToggle from './ThemeToggle'
import ConfigTools from './ConfigTools'

const Header = ({ title, onExportConfig, onImportConfig }) => {
  return (
    <div className="head bg-white dark:bg-dark-800 dark:text-white w-screen text-black flex justify-center">
      <div className="head__container max-w-screen-xl w-full py-3.5 h-24 flex">
        <div className="head__logo flex flex-none items-center">
          <a href="https://zouzonghua.cn/" tabIndex="0" aria-label="访问个人网站">
            <img className="p-3 h-16 w-16 md:h-20 md:w-20 rounded-full" src={Avatar} alt="logo" />
          </a>
        </div>
        <div className="head__title flex flex-1 text-xl md:text-3xl items-center">
          <h1>{title}</h1>
        </div>
        <div className="flex items-center justify-end pr-4 space-x-4">
          <ConfigTools 
            onExport={onExportConfig}
            onImport={onImportConfig}
          />
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
}

export default Header