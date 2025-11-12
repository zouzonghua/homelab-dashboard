import { useState } from 'react'
import PropTypes from 'prop-types'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faTrash } from "@fortawesome/free-solid-svg-icons";

const ServiceItem = ({ service, onOpenEdit, onDelete, isEditMode, dragHandleProps }) => {
  const [isHovered, setIsHovered] = useState(false);

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
      return new URL(`../assets/${path}`, import.meta.url).href
    } catch (error) {
      console.error('Error loading image:', error)
      return logo
    }
  }

  const handleEditClick = (e) => {
    e.stopPropagation();
    onOpenEdit();
  }

  return (
    <div
      className="shadow-lg text-black dark:text-white bg-white dark:bg-dark-700 rounded-lg flex items-center p-4 transition duration-500 ease-in-out transform hover:-translate-y-1 hover:scale-105 mb-6 cursor-pointer relative"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      tabIndex="0"
      aria-label={`访问 ${service.name}`}
      role="button"
    >
      {/* Logo - 编辑模式下可拖拽 */}
      <img
        {...(isEditMode ? dragHandleProps : {})}
        src={getImagePath(service.logo)}
        alt={`${service.name} logo`}
        className={`w-8 h-8 xl:w-12 xl:h-12 mr-2 xl:mr-4 object-contain ${
          isEditMode ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
        title={isEditMode ? '拖拽排序' : ''}
        onClick={(e) => isEditMode && e.stopPropagation()}
      />
      <p className="font-bold text-lg truncate">{service.name}</p>

      {/* 编辑和删除按钮 - 仅在编辑模式和悬停时显示 */}
      {isEditMode && isHovered && (
        <div className="absolute top-2 right-2 flex space-x-1">
          <button
            className="p-1 rounded-full opacity-80 hover:opacity-100 transition-opacity bg-white dark:bg-dark-800"
            onClick={handleEditClick}
            aria-label={`编辑 ${service.name}`}
          >
            <FontAwesomeIcon icon={faEdit} />
          </button>
          {onDelete && (
            <button
              className="p-1 rounded-full opacity-80 hover:opacity-100 transition-opacity bg-white dark:bg-dark-800"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              aria-label={`删除 ${service.name}`}
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

ServiceItem.propTypes = {
  service: PropTypes.shape({
    name: PropTypes.string.isRequired,
    logo: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired,
    target: PropTypes.string
  }).isRequired,
  onOpenEdit: PropTypes.func,
  onDelete: PropTypes.func,
  isEditMode: PropTypes.bool,
  dragHandleProps: PropTypes.object
}

export default ServiceItem 