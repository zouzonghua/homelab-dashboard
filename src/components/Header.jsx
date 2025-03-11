import PropTypes from 'prop-types'
import Avatar from '@/assets/icons/Avatar.jpg'

const Header = ({ title }) => {
  return (
    <div className="head bg-white dark:bg-dark-800 dark:text-white w-screen text-black flex justify-center">
      <div className="head__container max-w-screen-xl w-full py-3.5 h-24 flex">
        <div className="head__logo flex flex-none items-center">
          <a href="https://zouzonghua.cn/" tabIndex="0" aria-label="访问个人网站">
            <img className="p-3 h-20 w-20 rounded-full" src={Avatar} alt="logo" />
          </a>
        </div>
        <div className="head__title flex flex-1 text-3xl items-center">
          <h1>{title}</h1>
        </div>
      </div>
    </div>
  )
}

Header.propTypes = {
  title: PropTypes.string.isRequired
}

export default Header 