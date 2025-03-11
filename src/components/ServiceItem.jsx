import PropTypes from 'prop-types'

const ServiceItem = ({ service }) => {
  const handleClick = () => {
    window.open(service.url, service.target || '_blank')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  // 动态导入图片
  const getImagePath = (logo) => {
    // 如果是完整URL（以 http 或 https 开头）
    if (logo.startsWith('http')) {
      return logo
    }
    // 如果是本地资源，使用动态导入
    try {
      // 移除开头的 'assets/' 因为已经在 src/assets 下了
      const path = logo.replace('assets/', '')
      console.log(path, logo)
      return new URL(`../assets/${path}`, import.meta.url).href
    } catch (error) {
      console.error('Error loading image:', error)
      return logo
    }
  }

  return (
    <div 
      className="shadow-lg text-black dark:text-white bg-white dark:bg-dark-700 rounded-lg flex items-center p-4 transition duration-500 ease-in-out transform hover:-translate-y-1 hover:scale-105 mb-6 cursor-pointer"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex="0"
      aria-label={`访问 ${service.name}`}
      role="button"
    >
      <img 
        src={getImagePath(service.logo)}
        alt={`${service.name} logo`} 
        className="w-8 h-8 xl:w-12 xl:h-12 mr-2 xl:mr-4 object-contain"
      />
      <p className="font-bold text-lg truncate">{service.name}</p>
    </div>
  )
}

ServiceItem.propTypes = {
  service: PropTypes.shape({
    name: PropTypes.string.isRequired,
    logo: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired,
    target: PropTypes.string
  }).isRequired
}

export default ServiceItem 