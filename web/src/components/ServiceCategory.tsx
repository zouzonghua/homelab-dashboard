import ServiceItem from './ServiceItem'
import { getServiceStatus } from '../api'

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faEdit } from "@fortawesome/free-solid-svg-icons";
import { getCategoryIcon } from '../icons/categoryIcons'

import {
  DndContext,
  closestCenter,
  type DragEndEvent,
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
import type {
  CategoryWithServices,
  DragHandleProps,
  ServiceStatus,
  ServiceStatusMap,
  ServiceViewModel,
} from '../types'

type SortableServiceItemProps = {
  service: ServiceViewModel
  index: number
  onOpenEdit?: () => void
  onDelete?: () => void
  isEditMode?: boolean
  status?: ServiceStatus
}

type ServiceCategoryProps = {
  category: CategoryWithServices
  onOpenEditService?: (service: ServiceViewModel, serviceIndex: number) => void
  onOpenAddService?: () => void
  onDeleteService?: (serviceIndex: number) => void
  onDeleteCategory?: () => void
  onEditCategory?: () => void
  onReorderServices?: (services: ServiceViewModel[]) => void
  isEditMode?: boolean
  dragHandleProps?: DragHandleProps
  serviceStatus?: ServiceStatusMap
}

const getServiceSortableId = (service: ServiceViewModel, index: number) =>
  service.id != null ? String(service.id) : `${service.name}${index}`

// 可排序的服务项组件
const SortableServiceItem = ({ service, index, onOpenEdit, onDelete, isEditMode, status }: SortableServiceItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: getServiceSortableId(service, index), disabled: !isEditMode })

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
        status={status}
      />
    </li>
  )
}

const ServiceCategory = ({
  category,
  onOpenEditService,
  onOpenAddService,
  onDeleteService,
  onDeleteCategory,
  onEditCategory,
  onReorderServices,
  isEditMode,
  dragHandleProps,
  serviceStatus = {},
}: ServiceCategoryProps) => {
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

  const handleDeleteService = (index: number) => {
    if (onDeleteService && window.confirm(`确定要删除服务 "${category.list[index].name}" 吗？`)) {
      onDeleteService(index);
    }
  };

  const handleDeleteCategory = () => {
    if (onDeleteCategory && window.confirm(`确定要删除分类 "${category.name}" 吗？\n此操作将删除该分类下的所有服务！`)) {
      onDeleteCategory();
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = category.list.findIndex((service, idx) => active.id === getServiceSortableId(service, idx))
      const newIndex = category.list.findIndex((service, idx) => over.id === getServiceSortableId(service, idx))

      const newServices = arrayMove(category.list, oldIndex, newIndex)
      onReorderServices?.(newServices)
    }
  };

  return (
    <div className={`rack-section flex flex-col w-full p-2`}>
      <h2 className="rack-section__header group-title truncate text-2xl mt-2 mb-4 flex items-center justify-between">
        <span className="rack-section__label flex items-center">
          {/* 分类图标 - 编辑模式下可拖拽 */}
          <span
            {...(isEditMode ? dragHandleProps : {})}
            className={`rack-section__icon fa-lg pr-1 ${
              isEditMode
                ? 'cursor-grab active:cursor-grabbing p-2 -ml-2 rounded-md transition-colors'
                : ''
            }`}
            title={isEditMode ? '拖拽排序' : ''}
          >
            <FontAwesomeIcon icon={getCategoryIcon(category.icon)} />
          </span>
          {category.name}
        </span>
        {/* 编辑分类按钮 - 仅在编辑模式下显示 */}
        {isEditMode && onEditCategory && (
          <button
            onClick={onEditCategory}
            className="chassis-icon-button p-2 transition-colors text-lg"
            aria-label={`编辑分类 ${category.name}`}
            title="编辑分类"
          >
            <FontAwesomeIcon icon={faEdit} />
          </button>
        )}
      </h2>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={category.list.map((service, idx) => getServiceSortableId(service, idx))}
          strategy={verticalListSortingStrategy}
        >
          <ul>
            {category.list.map((service, index) => (
              <SortableServiceItem
                key={getServiceSortableId(service, index)}
                service={service}
                index={index}
                onOpenEdit={() => onOpenEditService?.(service, index)}
                onDelete={() => handleDeleteService(index)}
                isEditMode={isEditMode}
                status={getServiceStatus(serviceStatus, service) as ServiceStatus | undefined}
              />
            ))}
            {/* 添加服务按钮 - 仅在编辑模式下显示 */}
            {isEditMode && (
              <li>
                <button
                  onClick={onOpenAddService}
                  className="drive-bay drive-bay--add w-full flex items-center justify-center p-4 transition duration-300 ease-in-out mb-6 cursor-pointer"
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

export default ServiceCategory 
