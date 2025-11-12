import { useState } from 'react'
import PropTypes from 'prop-types'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as solidIcons from "@fortawesome/free-solid-svg-icons";

// 收集所有可用的图标
const availableIcons = Object.keys(solidIcons)
  .filter(key => key.startsWith('fa') && key !== 'fa' && key !== 'fas')
  .map(key => ({
    name: key,
    icon: solidIcons[key]
  }));

// 常用图标列表（排在前面）
const popularIcons = [
  'faHome', 'faServer', 'faDesktop', 'faLaptop', 'faCloud',
  'faDatabase', 'faHdd', 'faNetworkWired', 'faWifi', 'faGlobe',
  'faPhotoVideo', 'faMusic', 'faVideo', 'faImage', 'faFilm',
  'faGamepad', 'faBook', 'faNewspaper', 'faEnvelope', 'faComments',
  'faCog', 'faTools', 'faWrench', 'faScrewdriver', 'faHammer',
  'faShoppingCart', 'faStore', 'faShoppingBag', 'faCreditCard', 'faMoneyBill',
  'faLock', 'faKey', 'faShield', 'faUserShield', 'faFingerprint',
  'faChartLine', 'faChartBar', 'faChartPie', 'faAnalytics', 'faTachometerAlt',
  'faCalendar', 'faClock', 'faBell', 'faFlag', 'faStar',
  'faFolderOpen', 'faFolder', 'faFile', 'faFileAlt', 'faArchive',
  'faDownload', 'faUpload', 'faCloudDownloadAlt', 'faCloudUploadAlt', 'faSync',
  'faCode', 'faTerminal', 'faLaptopCode', 'faFileCode', 'faBug',
  'faHeart', 'faThumbsUp', 'faComment', 'faShare', 'faPaperPlane',
  'faUser', 'faUsers', 'faUserFriends', 'faUserCircle', 'faUserTie',
  'faStream', 'faBroadcastTower', 'faRss', 'faPodcast', 'faMicrophone',
  'faCamera', 'faCameraRetro', 'faPrint', 'faScan', 'faBarcode',
  'faLightbulb', 'faBolt', 'faFire', 'faSun', 'faMoon',
  'faCar', 'faBicycle', 'faPlane', 'faRocket', 'faShip',
  'faCoffee', 'faPizza', 'faUtensils', 'faGlassCheers', 'faBeer',
  'faMedkit', 'faHeartbeat', 'faPills', 'faSyringe', 'faStethoscope',
  'faGraduationCap', 'faSchool', 'faUniversity', 'faBookOpen', 'faPen',
  'faBox', 'faBoxes', 'faInbox', 'faClipboard', 'faClipboardList',
  'faTag', 'faTags', 'faBookmark', 'faAward', 'faTrophy'
];

const IconPicker = ({ value, onChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);

  // 过滤图标
  const filteredIcons = availableIcons.filter(({ name }) => {
    if (searchTerm) {
      return name.toLowerCase().includes(searchTerm.toLowerCase());
    }
    if (!showAll) {
      return popularIcons.includes(name);
    }
    return true;
  });

  // 显示的图标数量
  const displayIcons = showAll || searchTerm ? filteredIcons : filteredIcons.slice(0, 60);

  // 从 value 中提取图标名称（例如 "fa-solid fa-home" -> "faHome"）
  const getIconNameFromValue = (val) => {
    if (!val) return '';
    const parts = val.split(' ');
    const iconPart = parts[parts.length - 1]; // "fa-home"
    // 转换为驼峰命名 "fa-home" -> "faHome"
    return 'fa' + iconPart.split('-').slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  };

  const currentIconName = getIconNameFromValue(value);

  return (
    <div className="space-y-3">
      {/* 搜索框 */}
      <div>
        <input
          type="text"
          placeholder="搜索图标... (例如: home, server, cloud)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border rounded-md dark:bg-dark-800 dark:border-gray-700 text-sm"
        />
      </div>

      {/* 当前选中的图标 */}
      {value && (
        <div className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
          <span className="text-sm text-gray-600 dark:text-gray-400">当前图标:</span>
          <FontAwesomeIcon
            icon={solidIcons[currentIconName]}
            className="text-2xl text-blue-600 dark:text-blue-400"
          />
          <span className="text-sm font-mono text-gray-600 dark:text-gray-400">{value}</span>
        </div>
      )}

      {/* 图标网格 */}
      <div className="max-h-64 overflow-y-auto border rounded-md dark:border-gray-700 p-2">
        <div className="grid grid-cols-8 gap-2">
          {displayIcons.map(({ name, icon }) => {
            // 转换图标名称为 CSS 类名格式
            const iconClass = `fa-solid fa-${name.slice(2).replace(/([A-Z])/g, '-$1').toLowerCase()}`;
            const isSelected = currentIconName === name;

            return (
              <button
                key={name}
                type="button"
                onClick={() => onChange(iconClass)}
                className={`p-3 rounded-md transition-colors flex items-center justify-center ${
                  isSelected
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-dark-700 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                }`}
                title={iconClass}
              >
                <FontAwesomeIcon icon={icon} className="text-lg" />
              </button>
            );
          })}
        </div>
      </div>

      {/* 显示更多按钮 */}
      {!searchTerm && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full py-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          显示所有 {availableIcons.length} 个图标
        </button>
      )}

      {/* 统计信息 */}
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        {searchTerm
          ? `找到 ${displayIcons.length} 个图标`
          : showAll
          ? `显示 ${displayIcons.length} / ${availableIcons.length} 个图标`
          : `显示常用 ${displayIcons.length} 个图标`
        }
      </p>

      {/* 高级选项：手动输入 */}
      <details className="text-sm">
        <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
          高级：手动输入图标类名
        </summary>
        <div className="mt-2">
          <input
            type="text"
            placeholder="fa-solid fa-home"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-md dark:bg-dark-800 dark:border-gray-700 text-sm font-mono"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            格式: fa-solid fa-图标名 (例如: fa-solid fa-home)
          </p>
        </div>
      </details>
    </div>
  );
};

IconPicker.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired
};

export default IconPicker;
