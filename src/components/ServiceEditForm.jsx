import { useState } from 'react'
import PropTypes from 'prop-types'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faTimes } from "@fortawesome/free-solid-svg-icons";

const ServiceEditForm = ({ service, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: service.name,
    logo: service.logo,
    url: service.url,
    target: service.target || '_blank'
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
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white dark:bg-dark-700 rounded-lg shadow-lg mb-4">
      <div className="mb-3">
        <label htmlFor="name" className="block text-sm font-medium mb-1">名称</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-md dark:bg-dark-800 dark:border-gray-700"
          required
        />
      </div>
      
      <div className="mb-3">
        <label htmlFor="logo" className="block text-sm font-medium mb-1">Logo 路径</label>
        <input
          type="text"
          id="logo"
          name="logo"
          value={formData.logo}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-md dark:bg-dark-800 dark:border-gray-700"
          required
        />
      </div>
      
      <div className="mb-3">
        <label htmlFor="url" className="block text-sm font-medium mb-1">URL</label>
        <input
          type="url"
          id="url"
          name="url"
          value={formData.url}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-md dark:bg-dark-800 dark:border-gray-700"
          required
        />
      </div>
      
      <div className="mb-4">
        <label htmlFor="target" className="block text-sm font-medium mb-1">打开方式</label>
        <select
          id="target"
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
          className="px-4 py-2 bg-gray-200 dark:bg-dark-600 rounded-md hover:bg-gray-300 dark:hover:bg-dark-500 transition-colors text-white dark:text-black"
        >
          <FontAwesomeIcon icon={faTimes} className="mr-1" />
          取消
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          <FontAwesomeIcon icon={faSave} className="mr-1" />
          保存
        </button>
      </div>
    </form>
  );
};

ServiceEditForm.propTypes = {
  service: PropTypes.shape({
    name: PropTypes.string.isRequired,
    logo: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired,
    target: PropTypes.string
  }).isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default ServiceEditForm; 