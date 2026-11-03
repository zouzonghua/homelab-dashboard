import { Button } from '@base-ui/react/button'
import ServiceItem from './ServiceItem'
import type { DashboardLayout } from '../model/use-dashboard-layout'
import { getServiceStatus } from '../model/dashboard'
import type { ServiceStatus } from '@/shared/api'

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faEdit } from "@fortawesome/free-solid-svg-icons";
import { getCategoryIcon } from './category-icons'

import { DndContext, DragOverlay } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { createPortal } from 'react-dom'
import { sortableCollision, stationarySorting, useSortableList } from './use-sortable-list'
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
    setActivatorNodeRef,
    isOver,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: getServiceSortableId(service, index), disabled: !isEditMode })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <li ref={setNodeRef} style={style} data-drop-target={isOver && !isDragging ? true : undefined} data-service-index={index}>
      <ServiceItem
        service={service}
        onOpenEdit={onOpenEdit}
        onDelete={onDelete}
        isEditMode={isEditMode}
        dragHandleProps={isEditMode ? { ...attributes, ...listeners, ref: setActivatorNodeRef } : {}}
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
  const ids = category.list.map(getServiceSortableId)
  const { activeItem, keyboard, ...drag } = useSortableList(category.list, ids, onReorderServices)

  const dragByTitle = isEditMode && layout === 'masonry'

  return (
    <div className="rack-section" data-category-name={category.name} data-category-id={category.id}>
      <h2 tabIndex={0} className="rack-section__header">
        <span {...(dragByTitle ? dragHandleProps : {})} title={dragByTitle ? "Drag to reorder" : undefined} className="rack-section__label">
          {/* Category icon doubles as the drag handle in edit mode. */}
          {isEditMode && !dragByTitle
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
        {...drag}
        collisionDetection={sortableCollision}
      >
        <SortableContext
          items={ids}
          strategy={activeItem && !keyboard ? stationarySorting : layout === 'horizontal' ? rectSortingStrategy : verticalListSortingStrategy}
        >
          <ul className="rack-section__services">
            {category.list.map((service, index) => (
              <SortableServiceItem
                key={getServiceSortableId(service, index)}
                service={service}
                index={index}
                onOpenEdit={() => onOpenEditService?.(service, index)}
                onDelete={() => onDeleteService?.(index)}
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
        {isEditMode && createPortal(
          <DragOverlay dropAnimation={null}>
            {activeItem && <div className="sort-preview" aria-hidden="true">{activeItem.name}</div>}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>
    </div>
  )
}

export default ServiceCategory 
