import { useState } from 'react'
import PropTypes from 'prop-types'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faTrash } from "@fortawesome/free-solid-svg-icons";

const getStableHash = (value) =>
  Array.from(value || '').reduce((hash, char) => {
    const nextHash = ((hash << 5) - hash) + char.charCodeAt(0)
    return nextHash >>> 0
  }, 0)

const getFallbackColor = (service) => {
  const seed = getStableHash(`${service.name}:${service.url}`)
  const hue = seed % 360
  const saturation = 62 + (seed % 18)
  const lightness = 38 + (seed % 14)
  return `hsl(${hue} ${saturation}% ${lightness}%)`
}

const getStatusSeed = (service, key) =>
  getStableHash(`${service.name}:${service.url}:${key}`)

const escapeSVGText = (value) =>
  value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  }[char]))

const ServiceItem = ({ service, onOpenEdit, onDelete, isEditMode, dragHandleProps, status }) => {
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
    if (!logo) {
      return `/api/icon?url=${encodeURIComponent(service.url)}&name=${encodeURIComponent(service.name)}`
    }
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

  const getStatusClass = () => {
    if (!status) return 'status-port status-port-pending';
    return status.status === 'up' ? 'status-port status-online' : 'status-port status-port-down';
  }

  const getStatusStyle = () => {
    if (status?.status !== 'up') return undefined;
    const primary = getStatusSeed(service, 'primary')
    const secondary = getStatusSeed(service, 'secondary')
    const intensity = getStatusSeed(service, 'intensity')
    const hue = 122 + (intensity % 14)
    const idleLightness = 13 + (intensity % 7)
    const onLightness = 44 + (secondary % 12)
    return {
      '--status-delay': `${(primary % 193) / 100}s`,
      '--status-duration': `${1.18 + (primary % 67) / 100}s`,
      '--status-spark-delay': `${(secondary % 251) / 100}s`,
      '--status-spark-duration': `${0.72 + (secondary % 89) / 100}s`,
      '--status-idle-color': `hsl(${hue} 72% ${idleLightness}%)`,
      '--status-off-color': `hsl(${hue} 76% ${Math.max(7, idleLightness - 7)}%)`,
      '--status-on-color': `hsl(${hue} 82% ${onLightness}%)`,
      '--status-hot-color': `hsl(${hue} 92% ${Math.min(68, onLightness + 12)}%)`,
      '--status-glow-alpha': `${0.32 + (intensity % 26) / 100}`,
      '--status-hot-alpha': `${0.68 + (secondary % 24) / 100}`,
      '--status-reflect-alpha': `${0.22 + (primary % 20) / 100}`,
    };
  }

  const getStatusTitle = () => {
    if (!service.monitorEnabled) return '未启用状态检测';
    if (!status) return '状态检测中';
    if (status.status === 'up') {
      return `UP · ${status.responseTimeMs || 0}ms`;
    }
    return status.error ? `DOWN · ${status.error}` : 'DOWN';
  }

  const getStatusLatency = () => {
    if (!status) return '--ms'
    if (status.status !== 'up') return 'DOWN'
    return `${status.responseTimeMs || 0}ms`
  }

  const getFallbackLogo = () => {
    const initial = (service.name || '?').trim().charAt(0).toUpperCase() || '?'
    const background = getFallbackColor(service)
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <rect width="64" height="64" rx="14" fill="${background}"/>
        <text x="32" y="40" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="28" font-weight="700" fill="#ffffff">${escapeSVGText(initial)}</text>
      </svg>
    `
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  }

  return (
    <div
      className="drive-bay flex items-center p-4 transition duration-300 ease-in-out mb-6 cursor-pointer relative"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      tabIndex="0"
      aria-label={`访问 ${service.name}`}
      role="button"
    >
      {service.monitorEnabled && (
        <span className="drive-bay__status" title={getStatusTitle()}>
          <span
            className={getStatusClass()}
            style={getStatusStyle()}
            aria-label={`${service.name} 服务状态 ${status?.status || 'unknown'}`}
          />
          <span className="drive-bay__latency">{getStatusLatency()}</span>
        </span>
      )}
      {/* Logo - 编辑模式下可拖拽 */}
      <span
        {...(isEditMode ? dragHandleProps : {})}
        className={`drive-bay__logo w-8 h-8 xl:w-12 xl:h-12 mr-2 xl:mr-4 flex flex-none items-center justify-center ${
          isEditMode ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
        title={isEditMode ? '拖拽排序' : ''}
        onClick={(e) => isEditMode && e.stopPropagation()}
      >
        <img
          src={getImagePath(service.logo)}
          alt={`${service.name} logo`}
          className="w-full h-full object-contain"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.src = getFallbackLogo()
          }}
        />
      </span>
      <p className="drive-bay__name min-w-0 flex-1 font-bold text-lg truncate">{service.name}</p>

      {/* 编辑按钮 - 仅在编辑模式和悬停时显示 */}
      {isEditMode && isHovered && (
        <button
          className="drive-bay__edit absolute top-2 right-14 p-1"
          onClick={handleEditClick}
          aria-label={`编辑 ${service.name}`}
        >
          <FontAwesomeIcon icon={faEdit} />
        </button>
      )}
    </div>
  )
}

ServiceItem.propTypes = {
  service: PropTypes.shape({
    name: PropTypes.string.isRequired,
    logo: PropTypes.string,
    url: PropTypes.string.isRequired,
    target: PropTypes.string,
    monitorEnabled: PropTypes.bool
  }).isRequired,
  onOpenEdit: PropTypes.func,
  onDelete: PropTypes.func,
  isEditMode: PropTypes.bool,
  dragHandleProps: PropTypes.object,
  status: PropTypes.object
}

export default ServiceItem 
