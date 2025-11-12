import PropTypes from 'prop-types'
import ServiceItem from './ServiceItem'

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash, faFolder, faEdit } from "@fortawesome/free-solid-svg-icons";
import * as solidIcons from "@fortawesome/free-solid-svg-icons";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// 可排序的服务项组件
const SortableServiceItem = ({ service, index, onOpenEdit, onDelete, isEditMode }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: service.name + index, disabled: !isEditMode })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 1000 : 'auto',
    cursor: isDragging ? 'grabbing' : 'default',
  }

  return (
    <li ref={setNodeRef} style={style}>
      <ServiceItem
        service={service}
        onOpenEdit={onOpenEdit}
        onDelete={onDelete}
        isEditMode={isEditMode}
        dragHandleProps={isEditMode ? { ...attributes, ...listeners } : {}}
      />
    </li>
  )
}

SortableServiceItem.propTypes = {
  service: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  onOpenEdit: PropTypes.func,
  onDelete: PropTypes.func,
  isEditMode: PropTypes.bool
}

const ServiceCategory = ({ category, onOpenEditService, onOpenAddService, onDeleteService, onDeleteCategory, onEditCategory, onReorderServices, isEditMode, dragHandleProps }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 拖拽激活距离，避免误触
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 根据图标字符串获取图标对象
  const getIcon = (iconString) => {
    if (!iconString) {
      return <FontAwesomeIcon icon={faFolder} />;
    }

    try {
      // 从 "fa-solid fa-home" 转换为 "faHome"
      const iconName = iconString.split(' ').pop(); // "fa-home"
      const camelCaseName = 'fa' + iconName.split('-').slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');

      const icon = solidIcons[camelCaseName];
      if (icon) {
        return <FontAwesomeIcon icon={icon} />;
      }

      // 如果找不到图标，返回默认文件夹图标
      return <FontAwesomeIcon icon={faFolder} />;
    } catch (error) {
      console.error('Error loading icon:', error);
      return <FontAwesomeIcon icon={faFolder} />;
    }
  };

  const handleDeleteService = (index) => {
    if (onDeleteService && window.confirm(`确定要删除服务 "${category.list[index].name}" 吗？`)) {
      onDeleteService(index);
    }
  };

  const handleDeleteCategory = () => {
    if (onDeleteCategory && window.confirm(`确定要删除分类 "${category.name}" 吗？\n此操作将删除该分类下的所有服务！`)) {
      onDeleteCategory();
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event

    if (active.id !== over.id) {
      const oldIndex = category.list.findIndex((_, idx) => active.id === category.list[idx].name + idx)
      const newIndex = category.list.findIndex((_, idx) => over.id === category.list[idx].name + idx)

      const newServices = arrayMove(category.list, oldIndex, newIndex)
      onReorderServices(newServices)
    }
  };

  return (
    <div className={`flex flex-col w-full p-3`}>
      <h2 className="group-title truncate text-2xl mt-6 mb-5 flex items-center justify-between">
        <span className="flex items-center">
          {/* 分类图标 - 编辑模式下可拖拽 */}
          <span
            {...(isEditMode ? dragHandleProps : {})}
            className={`fa-lg pr-1 ${
              isEditMode
                ? 'cursor-grab active:cursor-grabbing p-2 -ml-2 rounded-md transition-colors'
                : ''
            }`}
            title={isEditMode ? '拖拽排序' : ''}
          >
            {getIcon(category.icon)}
          </span>
          {category.name}
        </span>
        {/* 编辑和删除分类按钮 - 仅在编辑模式下显示 */}
        {isEditMode && (
          <div className="flex space-x-1 text-lg">
            {onEditCategory && (
              <button
                onClick={onEditCategory}
                className="p-2 rounded-full transition-colors"
                aria-label={`编辑分类 ${category.name}`}
                title="编辑分类"
              >
                <FontAwesomeIcon icon={faEdit} />
              </button>
            )}
            {onDeleteCategory && (
              <button
                onClick={handleDeleteCategory}
                className="p-2 rounded-full transition-colors"
                aria-label={`删除分类 ${category.name}`}
                title="删除分类"
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            )}
          </div>
        )}
      </h2>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={category.list.map((service, idx) => service.name + idx)}
          strategy={verticalListSortingStrategy}
        >
          <ul>
            {category.list.map((service, index) => (
              <SortableServiceItem
                key={service.name + index}
                service={service}
                index={index}
                onOpenEdit={() => onOpenEditService(service, index)}
                onDelete={() => handleDeleteService(index)}
                isEditMode={isEditMode}
              />
            ))}
            {/* 添加服务按钮 - 仅在编辑模式下显示 */}
            {isEditMode && (
              <li>
                <button
                  onClick={onOpenAddService}
                  className="w-full shadow-lg text-gray-600 dark:text-gray-400 bg-white dark:bg-dark-700 rounded-lg flex items-center justify-center p-4 transition duration-500 ease-in-out transform hover:-translate-y-1 hover:scale-105 mb-6 cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500"
                  aria-label={`添加服务到 ${category.name}`}
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2 text-xl" />
                  <span className="font-semibold">添加服务</span>
                </button>
              </li>
            )}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  )
}

ServiceCategory.propTypes = {
  category: PropTypes.shape({
    name: PropTypes.string.isRequired,
    icon: PropTypes.string,
    list: PropTypes.array.isRequired
  }).isRequired,
  onOpenEditService: PropTypes.func,
  onOpenAddService: PropTypes.func,
  onDeleteService: PropTypes.func,
  onDeleteCategory: PropTypes.func,
  onEditCategory: PropTypes.func,
  onReorderServices: PropTypes.func,
  isEditMode: PropTypes.bool,
  dragHandleProps: PropTypes.object
}

export default ServiceCategory 