import { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTools, faDownload, faUpload } from "@fortawesome/free-solid-svg-icons";

const ConfigTools = ({ onExport, onImport }) => {
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef(null);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleExport = () => {
    onExport();
    setIsOpen(false);
  };

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onImport(file);
      // 重置 input 值，允许导入相同文件
      e.target.value = '';
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={toggleMenu}
        className="p-2 transition-colors"
        aria-label="配置工具"
      >
        <FontAwesomeIcon icon={faTools} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 py-2 w-48 bg-white dark:bg-dark-700 rounded-md shadow-xl z-10 animate-fadeIn">
          <button
            onClick={handleExport}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
          >
            <FontAwesomeIcon icon={faDownload} className="mr-2" />
            <span>导出配置</span>
          </button>
          <button
            onClick={handleImportClick}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
          >
            <FontAwesomeIcon icon={faUpload} className="mr-2" />
            <span>导入配置</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
        </div>
      )}
    </div>
  );
};

ConfigTools.propTypes = {
  onExport: PropTypes.func.isRequired,
  onImport: PropTypes.func.isRequired,
};

export default ConfigTools; 