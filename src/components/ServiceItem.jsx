import { useState } from 'react'
import PropTypes from 'prop-types'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit } from "@fortawesome/free-solid-svg-icons";
import ServiceEditForm from './ServiceEditForm'

const ServiceItem = ({ service, onEdit }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleClick = () => {
    if (!isEditing) {
      window.open(service.url, service.target || '_blank')
    }
  }

  const handleKeyDown = (e) => {
    if (!isEditing && (e.key === 'Enter' || e.key === ' ')) {
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
    setIsEditing(true);
  }

  const handleSave = (updatedService) => {
    if (onEdit) {
      onEdit({
        ...service,
        ...updatedService
      });
    }
    setIsEditing(false);
  }

  const handleCancel = () => {
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="transform transition-all duration-300 ease-in-out animate-fadeIn">
        <ServiceEditForm 
          service={service} 
          onSave={handleSave} 
          onCancel={handleCancel} 
        />
      </div>
    );
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
      <img 
        src={getImagePath(service.logo)}
        alt={`${service.name} logo`} 
        className="w-8 h-8 xl:w-12 xl:h-12 mr-2 xl:mr-4 object-contain"
      />
      <p className="font-bold text-lg truncate">{service.name}</p>
      
      {isHovered && (
        <button
          className="absolute top-2 right-2 p-1  rounded-full opacity-80 hover:opacity-100 transition-opacity"
          onClick={handleEditClick}
          aria-label={`编辑 ${service.name}`}
        >
          <FontAwesomeIcon icon={faEdit} className="text-gray-700 dark:text-gray-300" />
        </button>
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
  onEdit: PropTypes.func
}

export default ServiceItem 