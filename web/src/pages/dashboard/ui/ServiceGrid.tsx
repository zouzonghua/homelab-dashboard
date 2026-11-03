import type { DashboardSettings, MasonryOrder } from '@/shared/api'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { getCategoryIcon } from './category-icons'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { DashboardLayout } from '../model/use-dashboard-layout'
import ServiceCategory from './ServiceCategory'
import { DndContext, DragOverlay, useDroppable, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { createPortal } from 'react-dom'
import { masonryCollision, sortableCollision, stationarySorting, useSortableList } from './use-sortable-list'
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
  placements?: DashboardSettings['masonryPlacements']
  layout?: DashboardLayout
  onOpenEditService?: BivariantCallback<[ServiceViewModel]>
  onOpenAddService?: BivariantCallback<[number]>
  onDeleteService?: BivariantCallback<[number]>
  onDeleteCategory?: BivariantCallback<[number]>
  onOpenEditCategory?: BivariantCallback<[CategoryWithServices]>
  onReorderCategories?: BivariantCallback<[CategoryWithServices[], MasonryOrder?]>
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

function ColumnTail({ column }: { column: number }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `masonry-tail-${column}`,
    data: { columnTail: column },
  })

  return <li ref={setNodeRef} className="masonry-tail" data-active={isOver || undefined} aria-hidden="true" />
}

const ServiceGrid = ({ categories, columns, placements, layout = 'vertical', onOpenEditService, onOpenAddService, onDeleteService, onDeleteCategory, onOpenEditCategory, onReorderCategories, onReorderServices, isEditMode, serviceStatus }: ServiceGridProps) => {
  const ids = categories.map((category, index) => category.id ?? `pending-${index}`)
  const parsedColumns = parseInt(String(columns))
  const columnCount = parsedColumns >= 1 && parsedColumns <= 6 ? parsedColumns : 4

  const rackRef = useRef<HTMLDivElement>(null)
  const [availableColumns, setAvailableColumns] = useState(1)
  const [legacyPlacements] = useState<ServiceGridProps['placements']>(() => {
    try {
      return JSON.parse(localStorage.getItem('dashboard-masonry-columns') ?? '{}')
    } catch {
      return {}
    }
  })

  useEffect(() => {
    const rack = rackRef.current
    if (layout !== 'masonry' || !rack) return

    const observer = new ResizeObserver(([entry]) => {
      setAvailableColumns(window.innerWidth < 640 ? 1 : Math.max(1, Math.floor(entry.contentRect.width / 260)))
    })
    observer.observe(rack)
    return () => observer.disconnect()
  }, [layout])

  const placementKey = Math.min(availableColumns, 5)
  const masonryColumns = Math.max(1, Math.min(placementKey, categories.length))
  const columnSlots = placementKey
  const saved = placements?.[placementKey] ?? legacyPlacements?.[placementKey]
  const hasSavedPlacement = Array.isArray(saved?.ids) && Array.isArray(saved?.sizes)
    && saved.sizes.length <= 5
    && saved.sizes.every((size) => Number.isInteger(size) && size >= 0)
    && saved.sizes.reduce((total, size) => total + size, 0) === saved.ids.length
  const savedColumns = new Map<string | number, number>()
  if (hasSavedPlacement) {
    let offset = 0
    saved.sizes.forEach((size, column) => {
      for (const id of saved.ids.slice(offset, offset + size)) savedColumns.set(id, Math.min(column, columnSlots - 1))
      offset += size
    })
  }
  const retainedColumns = ids.flatMap((id) => {
    const column = savedColumns.get(id)
    return column == null ? [] : [column]
  })
  const groups = Array.from({ length: columnSlots }, (): CategoryWithServices[] => [])
  if (retainedColumns.length) {
    const lastColumn = Math.max(...retainedColumns)
    categories.forEach((category, index) => {
      groups[savedColumns.get(ids[index]) ?? lastColumn].push(category)
    })
  } else {
    categories.forEach((category, index) => {
      groups[Math.floor(index * masonryColumns / categories.length)].push(category)
    })
  }

  const displayed = layout === 'masonry' ? groups.flat() : categories
  const displayedIds = displayed.map((category) => ids[categories.indexOf(category)])
  const { activeItem, keyboard, ...drag } = useSortableList(displayed, displayedIds, onReorderCategories)

  const indexedGroups = groups.map((group, column) => ({ group, column }))
  const visibleGroups = indexedGroups.filter(({ group }) => group.length > 0)
  if (isEditMode && activeItem && !keyboard) {
    visibleGroups.push(...indexedGroups.filter(({ group }) => group.length === 0))
  }
  const visibleColumns = Math.max(1, visibleGroups.length)

  const handleDragEnd = (event: DragEndEvent) => {
    if (layout !== 'masonry') {
      drag.onDragEnd(event)
      return
    }

    drag.onDragEnd({ ...event, over: null })
    const { active, over } = event
    if (!over || active.id === over.id || !onReorderCategories) return
    const from = displayedIds.indexOf(active.id)
    const to = displayedIds.indexOf(over.id)
    const moved = displayed[from]
    const target = displayed[to]
    const tail = over.data.current?.columnTail
    const column = typeof tail === 'number' ? tail : groups.findIndex((group) => group.includes(target))
    if (moved?.id == null || !groups[column]) return

    const next = groups.map((group) => group.filter((category) => category !== moved))
    const destination = next[column]
    const index = typeof tail === 'number' ? destination.length : destination.indexOf(target) + (from < to ? 1 : 0)
    destination.splice(index, 0, moved)
    const visualOrder = visibleGroups.map(({ column }) => next[column])
    const reorderedGroups = [
      ...visualOrder.filter((group) => group.length > 0),
      ...visualOrder.filter((group) => group.length === 0),
    ]
    const ordered = reorderedGroups.flat()
    onReorderCategories(ordered, { capacity: placementKey, sizes: reorderedGroups.map((group) => group.length) })
  }

  const renderCategory = (category: CategoryWithServices, index: number) => (
    <SortableCategoryItem
      key={ids[index]}
      sortableId={ids[index]}
      category={category}
      index={displayed.indexOf(category)}
      activeIndex={activeItem ? displayed.indexOf(activeItem) : -1}
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
  )

  return (
    <div
      ref={rackRef}
      className={`chassis-rack${layout === 'horizontal' ? ' chassis-rack--horizontal' : ''}`}
      style={{ '--dashboard-columns': columnCount, '--masonry-columns': visibleColumns } as CSSProperties}
      data-layout={layout}
    >
      <DndContext
        {...drag}
        onDragEnd={handleDragEnd}
        collisionDetection={layout === 'masonry' ? masonryCollision : sortableCollision}
      >
        <SortableContext
          items={displayedIds}
          strategy={layout === 'masonry' || (activeItem && !keyboard) ? stationarySorting : layout === 'horizontal' ? verticalListSortingStrategy : rectSortingStrategy}
        >
          {layout === 'masonry' ? (
            <div className="masonry-grid">
              {visibleGroups.map(({ group, column }) => (
                <ul className="masonry-column" key={column}>
                  {group.map((category) => renderCategory(category, categories.indexOf(category)))}
                  {isEditMode && <ColumnTail column={column} />}
                </ul>
              ))}
            </div>
          ) : (
            <ul className="category-grid">{categories.map(renderCategory)}</ul>
          )}
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
