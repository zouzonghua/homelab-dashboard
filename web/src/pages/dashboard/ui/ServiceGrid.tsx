import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { getCategoryIcon } from './category-icons'
import type { CSSProperties } from 'react'
import type { DashboardLayout } from '../model/use-dashboard-layout'
import ServiceCategory from './ServiceCategory'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { createPortal } from 'react-dom'
import { sortableCollision, stationarySorting, useSortableList } from './use-sortable-list'
import { CSS } from '@dnd-kit/utilities'
import type {
  BivariantCallback,
  CategoryWithServices,
  ServiceStatusMap,
  ServiceViewModel,
} from '../model/dashboard'

type SortableCategoryItemProps = {
  category: CategoryWithServices
  index: number
  sortableId: string | number
  activeIndex: number
  layout: DashboardLayout
  onOpenEditService?: BivariantCallback<[ServiceViewModel]>
  onOpenAddService?: BivariantCallback<[number]>
  onDeleteService?: BivariantCallback<[number]>
  onDeleteCategory?: BivariantCallback<[number]>
  onOpenEditCategory?: BivariantCallback<[CategoryWithServices]>
  onReorderServices?: BivariantCallback<[number, ServiceViewModel[]]>
  isEditMode?: boolean
  serviceStatus?: ServiceStatusMap
}

type ServiceGridProps = {
  categories: CategoryWithServices[]
  columns?: string | number
  layout?: DashboardLayout
  onOpenEditService?: BivariantCallback<[ServiceViewModel]>
  onOpenAddService?: BivariantCallback<[number]>
  onDeleteService?: BivariantCallback<[number]>
  onDeleteCategory?: BivariantCallback<[number]>
  onOpenEditCategory?: BivariantCallback<[CategoryWithServices]>
  onReorderCategories?: BivariantCallback<[CategoryWithServices[]]>
  onReorderServices?: BivariantCallback<[number, ServiceViewModel[]]>
  isEditMode?: boolean
  serviceStatus?: ServiceStatusMap
}

// Sortable category item.
const SortableCategoryItem = ({ category, index, sortableId, activeIndex, layout, onOpenEditService, onOpenAddService, onDeleteService, onDeleteCategory, onOpenEditCategory, onReorderServices, isEditMode, serviceStatus }: SortableCategoryItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    isOver,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId, disabled: !isEditMode || category.id == null })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <li
      ref={setNodeRef}
      style={style} data-drop-target={isOver && !isDragging ? true : undefined}
      data-insertion={layout === 'masonry' && isOver && !isDragging && activeIndex >= 0
        ? index < activeIndex ? 'before' : 'after'
        : undefined}
      className="category-tile"
    >
      <ServiceCategory
        category={category}
        layout={layout}
        onOpenEditService={onOpenEditService}
        onOpenAddService={() => {
          if (category.id != null) onOpenAddService?.(category.id)
        }}
        onDeleteService={(serviceIndex) => {
          const serviceId = category.list[serviceIndex]?.id
          if (serviceId != null) onDeleteService?.(serviceId)
        }}
        onDeleteCategory={() => {
          if (category.id != null) onDeleteCategory?.(category.id)
        }}
        onEditCategory={() => onOpenEditCategory?.(category)}
        onReorderServices={(newServices) => {
          if (category.id != null) onReorderServices?.(category.id, newServices)
        }}
        isEditMode={isEditMode}
        dragHandleProps={isEditMode ? { ...attributes, ...listeners, ref: setActivatorNodeRef } : {}}
        serviceStatus={serviceStatus}
      />
    </li>
  )
}

const ServiceGrid = ({ categories, columns, layout = 'vertical', onOpenEditService, onOpenAddService, onDeleteService, onDeleteCategory, onOpenEditCategory, onReorderCategories, onReorderServices, isEditMode, serviceStatus }: ServiceGridProps) => {
  const ids = categories.map((category, index) => category.id ?? `pending-${index}`)
  const { activeItem, keyboard, ...drag } = useSortableList(categories, ids, onReorderCategories)
  const parsedColumns = parseInt(String(columns))
  const columnCount = parsedColumns >= 1 && parsedColumns <= 6 ? parsedColumns : 4

  return (
    <div
      className={`chassis-rack${layout === 'horizontal' ? ' chassis-rack--horizontal' : ''}`}
      style={{ '--dashboard-columns': columnCount } as CSSProperties}
      data-layout={layout}
    >
      <DndContext
        {...drag}
        collisionDetection={sortableCollision}
      >
        <SortableContext
          items={ids}
          strategy={layout === 'masonry' || (activeItem && !keyboard) ? stationarySorting : layout === 'horizontal' ? verticalListSortingStrategy : rectSortingStrategy}
        >
          <ul className="category-grid">
            {categories.map((category, index) => (
              <SortableCategoryItem
                key={ids[index]}
                sortableId={ids[index]}
                category={category}
                index={index}
                activeIndex={activeItem ? categories.indexOf(activeItem) : -1}
                layout={layout}
                onOpenEditService={onOpenEditService}
                onOpenAddService={onOpenAddService}
                onDeleteService={onDeleteService}
                onDeleteCategory={onDeleteCategory}
                onOpenEditCategory={onOpenEditCategory}
                onReorderServices={onReorderServices}
                isEditMode={isEditMode}
                serviceStatus={serviceStatus}
              />
            ))}
          </ul>
        </SortableContext>
        {isEditMode && createPortal(
          <DragOverlay dropAnimation={null}>
            {activeItem && <div className="sort-preview" aria-hidden="true"><FontAwesomeIcon icon={getCategoryIcon(activeItem.icon)} /> {activeItem.name}</div>}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>
    </div>
  )
}

export default ServiceGrid 
