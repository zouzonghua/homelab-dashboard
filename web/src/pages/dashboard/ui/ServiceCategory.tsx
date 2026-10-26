import { Button } from '@base-ui/react/button'
import ServiceItem from './ServiceItem'
import type { DashboardLayout } from '../model/use-dashboard-layout'
import { getServiceStatus } from '../model/dashboard'
import type { ServiceStatus } from '@/shared/api'

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faEdit } from "@fortawesome/free-solid-svg-icons";
import { getCategoryIcon } from './category-icons'

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
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type {
  CategoryWithServices,
  DragHandleProps,
  ServiceStatusMap,
  ServiceViewModel,
} from '../model/dashboard'

type SortableServiceItemProps = {
  service: ServiceViewModel
  index: number
  onOpenEdit?: () => void
  onDelete?: () => void
  isEditMode?: boolean
  status?: ServiceStatus
}

type ServiceCategoryProps = {
  layout?: DashboardLayout
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

// Sortable service item.
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
    <li ref={setNodeRef} style={style} data-service-index={index}>
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
  layout = 'vertical',
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
        distance: 8, // Activation distance to avoid accidental drags.
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDeleteService = (index: number) => onDeleteService?.(index)
  const handleDeleteCategory = () => onDeleteCategory?.()

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
    <div className="rack-section" data-category-name={category.name}>
      <h2 tabIndex={0} className="rack-section__header">
        <span className="rack-section__label">
          {/* Category icon doubles as the drag handle in edit mode. */}
          {isEditMode
            ? <Button nativeButton={false} render={<span />} {...dragHandleProps} className="rack-section__icon" title="Drag to reorder"><FontAwesomeIcon icon={getCategoryIcon(category.icon)} /></Button>
            : <span className="rack-section__icon"><FontAwesomeIcon icon={getCategoryIcon(category.icon)} /></span>}
          {category.name}
        </span>
        {/* Category edit button, only visible in edit mode. */}
        {isEditMode && onEditCategory && (
          <Button
            onClick={onEditCategory}
            className="chassis-icon-button"
            aria-label={`Edit category ${category.name}`}
            title="Edit category"
          >
            <FontAwesomeIcon icon={faEdit} />
          </Button>
        )}
      </h2>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={category.list.map((service, idx) => getServiceSortableId(service, idx))}
          strategy={layout === 'horizontal' ? rectSortingStrategy : verticalListSortingStrategy}
        >
          <ul className="rack-section__services">
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
            {/* Add service button, only visible in edit mode. */}
            {isEditMode && (
              <li>
                <Button
                  onClick={onOpenAddService}
                  className="drive-bay drive-bay--add"
                  aria-label={`Add service to ${category.name}`}
                >
                  <FontAwesomeIcon icon={faPlus}  />
                  <span >Add service</span>
                </Button>
              </li>
            )}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  )
}

export default ServiceCategory 
