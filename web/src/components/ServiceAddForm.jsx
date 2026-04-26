import { useState } from 'react'
import PropTypes from 'prop-types'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTimes } from "@fortawesome/free-solid-svg-icons";

const ServiceAddForm = ({ onAdd, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    logo: '',
    url: '',
    target: '_blank'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(formData);
    // 重置表单
    setFormData({
      name: '',
      logo: '',
      url: '',
      target: '_blank'
    });
  };

  return (
    <form onSubmit={handleSubmit}>

      <div className="mb-3">
        <label htmlFor="add-name" className="block text-sm font-medium mb-1">名称</label>
        <input
          type="text"
          id="add-name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-md dark:bg-dark-800 dark:border-gray-700"
          placeholder="例如：Jellyfin"
          required
        />
      </div>

      <div className="mb-3">
        <label htmlFor="add-logo" className="block text-sm font-medium mb-1">Logo 路径</label>
        <input
          type="text"
          id="add-logo"
          name="logo"
          value={formData.logo}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-md dark:bg-dark-800 dark:border-gray-700"
          placeholder="assets/icons/logo.png 或 https://..."
          required
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          本地图标：assets/icons/文件名.png 或 远程URL
        </p>
      </div>

      <div className="mb-3">
        <label htmlFor="add-url" className="block text-sm font-medium mb-1">URL</label>
        <input
          type="url"
          id="add-url"
          name="url"
          value={formData.url}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-md dark:bg-dark-800 dark:border-gray-700"
          placeholder="http://192.168.1.100:8096"
          required
        />
      </div>

      <div className="mb-4">
        <label htmlFor="add-target" className="block text-sm font-medium mb-1">打开方式</label>
        <select
          id="add-target"
          name="target"
          value={formData.target}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-md dark:bg-dark-800 dark:border-gray-700"
        >
          <option value="_blank">新窗口 (_blank)</option>
          <option value="_self">当前窗口 (_self)</option>
        </select>
      </div>

      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 dark:bg-dark-600 rounded-md hover:bg-gray-300 dark:hover:bg-dark-500 transition-colors"
        >
          <FontAwesomeIcon icon={faTimes} className="mr-1" />
          取消
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          <FontAwesomeIcon icon={faPlus} className="mr-1" />
          添加
        </button>
      </div>
    </form>
  );
};

ServiceAddForm.propTypes = {
  onAdd: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default ServiceAddForm;
