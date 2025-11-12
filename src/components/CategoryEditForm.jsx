import { useState } from 'react'
import PropTypes from 'prop-types'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faTimes } from "@fortawesome/free-solid-svg-icons";
import IconPicker from './IconPicker'

const CategoryEditForm = ({ category, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: category.name,
    icon: category.icon || 'fa-solid fa-folder'
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
    <div>
      <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">编辑分类</h3>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="edit-category-name" className="block text-sm font-medium mb-2">分类名称</label>
          <input
            type="text"
            id="edit-category-name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md dark:bg-dark-800 dark:border-gray-700"
            placeholder="例如：Development Tools"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">图标</label>
          <IconPicker
            value={formData.icon}
            onChange={(iconValue) => setFormData(prev => ({ ...prev, icon: iconValue }))}
          />
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
            <FontAwesomeIcon icon={faSave} className="mr-1" />
            保存
          </button>
        </div>
      </form>
    </div>
  );
};

CategoryEditForm.propTypes = {
  category: PropTypes.shape({
    name: PropTypes.string.isRequired,
    icon: PropTypes.string,
    list: PropTypes.array
  }).isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default CategoryEditForm;
