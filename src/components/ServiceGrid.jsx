import PropTypes from 'prop-types'
import ServiceCategory from './ServiceCategory'
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
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// 可排序的分类项组件
const SortableCategoryItem = ({ category, index, columnClass, onOpenEditService, onOpenAddService, onDeleteService, onDeleteCategory, onOpenEditCategory, onReorderServices, isEditMode }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.name, disabled: !isEditMode })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 1000 : 'auto',
    cursor: isDragging ? 'grabbing' : 'default',
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex flex-col ${columnClass} mb-4`}
    >
      <ServiceCategory
        category={category}
        onOpenEditService={(service, serviceIndex) =>
          onOpenEditService(category.name, service, serviceIndex)
        }
        onOpenAddService={() => onOpenAddService(category.name)}
        onDeleteService={(serviceIndex) =>
          onDeleteService(category.name, serviceIndex)
        }
        onDeleteCategory={() => onDeleteCategory(category.name)}
        onEditCategory={() => onOpenEditCategory(category, index)}
        onReorderServices={(newServices) => onReorderServices(category.name, newServices)}
        isEditMode={isEditMode}
        dragHandleProps={isEditMode ? { ...attributes, ...listeners } : {}}
      />
    </li>
  )
}

SortableCategoryItem.propTypes = {
  category: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  columnClass: PropTypes.string.isRequired,
  onOpenEditService: PropTypes.func,
  onOpenAddService: PropTypes.func,
  onDeleteService: PropTypes.func,
  onDeleteCategory: PropTypes.func,
  onOpenEditCategory: PropTypes.func,
  onReorderServices: PropTypes.func,
  isEditMode: PropTypes.bool
}

const ServiceGrid = ({ categories, columns, onOpenEditService, onOpenAddService, onDeleteService, onDeleteCategory, onOpenEditCategory, onReorderCategories, onReorderServices, isEditMode }) => {
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

  // 计算每个卡片的宽度类名
  const getColumnClass = () => {
    switch (parseInt(columns)) {
      case 1: return 'w-full'
      case 2: return 'w-full md:w-1/2'
      case 3: return 'w-full md:w-1/3'
      case 4: return 'w-full md:w-1/4'
      case 5: return 'w-full md:w-1/5'
      case 6: return 'w-full md:w-1/6'
      default: return 'w-full md:w-1/4'
    }
  }

  const handleDragEnd = (event) => {
    const { active, over } = event

    if (active.id !== over.id) {
      const oldIndex = categories.findIndex((cat) => cat.name === active.id)
      const newIndex = categories.findIndex((cat) => cat.name === over.id)

      const newCategories = arrayMove(categories, oldIndex, newIndex)
      onReorderCategories(newCategories)
    }
  }

  return (
    <div className="container dark:text-white max-w-screen-xl p-2 xl:p-0 xl:mt-6">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={categories.map((cat) => cat.name)}
          strategy={rectSortingStrategy}
        >
          <ul className="flex flex-wrap">
            {categories.map((category, index) => (
              <SortableCategoryItem
                key={category.name}
                category={category}
                index={index}
                columnClass={getColumnClass()}
                onOpenEditService={onOpenEditService}
                onOpenAddService={onOpenAddService}
                onDeleteService={onDeleteService}
                onDeleteCategory={onDeleteCategory}
                onOpenEditCategory={onOpenEditCategory}
                onReorderServices={onReorderServices}
                isEditMode={isEditMode}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  )
}

ServiceGrid.propTypes = {
  categories: PropTypes.array.isRequired,
  columns: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onOpenEditService: PropTypes.func,
  onOpenAddService: PropTypes.func,
  onDeleteService: PropTypes.func,
  onDeleteCategory: PropTypes.func,
  onOpenEditCategory: PropTypes.func,
  onReorderCategories: PropTypes.func,
  onReorderServices: PropTypes.func,
  isEditMode: PropTypes.bool
}

export default ServiceGrid 