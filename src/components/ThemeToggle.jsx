import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSun, faMoon, faDesktop, faChevronDown } from "@fortawesome/free-solid-svg-icons";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // 获取当前主题的图标
  const getCurrentIcon = () => {
    switch(theme) {
      case 'light': return <FontAwesomeIcon icon={faSun} />;
      case 'dark': return <FontAwesomeIcon icon={faMoon} />;
      case 'system': return <FontAwesomeIcon icon={faDesktop} />;
      default: return <FontAwesomeIcon icon={faDesktop} />;
    }
  };

  // 获取当前主题的中文名
  const getCurrentName = () => {
    switch(theme) {
      case 'light': return '明亮';
      case 'dark': return '暗黑';
      case 'system': return '跟随系统';
      default: return '跟随系统';
    }
  };

  // 切换下拉菜单的打开/关闭状态
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // 选择主题
  const selectTheme = (newTheme) => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  // 点击其他地方关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        className="flex items-center justify-center space-x-1 p-2 rounded-lg bg-gray-100 dark:bg-dark-700 text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors"
        onClick={toggleDropdown}
        aria-label="切换主题"
        aria-expanded={isOpen}
      >
        <span className="mr-2">{getCurrentIcon()}</span>
        <span className="hidden md:inline">{getCurrentName()}</span>
        <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-700 rounded-lg shadow-lg z-50 py-1 text-sm">
          <button
            className="flex items-center w-full px-4 py-2 text-left  hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => selectTheme('light')}
          >
            <FontAwesomeIcon icon={faSun} className="mr-2 w-4 h-4" />
            明亮
          </button>
          <button
            className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => selectTheme('dark')}
          >
            <FontAwesomeIcon icon={faMoon} className="mr-2 w-4 h-4" />
            暗黑
          </button>
          <button
            className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => selectTheme('system')}
          >
            <FontAwesomeIcon icon={faDesktop} className="mr-2 w-4 h-4" />
            跟随系统
          </button>
        </div>
      )}
    </div>
  );
};

export default ThemeToggle; 