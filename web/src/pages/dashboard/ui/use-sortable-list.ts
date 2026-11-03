import { useState } from 'react'
import {
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates, type SortingStrategy } from '@dnd-kit/sortable'

const gapTolerance = 10

export const stationarySorting: SortingStrategy = () => null

export const sortableCollision: CollisionDetection = (args) => {
  const pointer = args.pointerCoordinates
  if (!pointer) return closestCenter(args)

  const hits = pointerWithin(args)
  if (hits.length) return hits

  return args.droppableContainers.flatMap(({ id }) => {
    const rect = args.droppableRects.get(id)
    if (!rect) return []
    const dx = Math.max(rect.left - pointer.x, 0, pointer.x - rect.right)
    const dy = Math.max(rect.top - pointer.y, 0, pointer.y - rect.bottom)
    const distance = Math.hypot(dx, dy)
    return distance <= gapTolerance ? [{ id, data: { value: distance } }] : []
  }).sort((a, b) => a.data.value - b.data.value)
}

export function useSortableList<T>(items: T[], ids: UniqueIdentifier[], onReorder?: (items: T[]) => void) {
  const [active, setActive] = useState<{ id: UniqueIdentifier; keyboard: boolean } | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  return {
    activeItem: active ? items[ids.indexOf(active.id)] : undefined,
    keyboard: active?.keyboard ?? false,
    sensors,
    onDragStart: ({ active, activatorEvent }: DragStartEvent) => {
      setActive({ id: active.id, keyboard: activatorEvent.type === 'keydown' })
    },
    onDragCancel: () => setActive(null),
    onDragEnd: ({ active, over }: DragEndEvent) => {
      setActive(null)
      if (!over || active.id === over.id) return
      const from = ids.indexOf(active.id)
      const to = ids.indexOf(over.id)
      if (from >= 0 && to >= 0) onReorder?.(arrayMove(items, from, to))
    },
  }
}
