import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'

type SolidIconModule = Record<string, IconDefinition | undefined> & {
  definition?: IconDefinition
}

const solidIconModules = import.meta.glob<SolidIconModule>('/node_modules/@fortawesome/free-solid-svg-icons/fa*.js')

const iconCache = new Map<string, IconDefinition | null>()

export const availableSolidIconNames = Object.keys(solidIconModules)
  .map((path) => path.match(/\/(fa[^/]+)\.js$/)?.[1])
  .filter((name): name is string => Boolean(name))
  .sort()

export const getSolidIconNameFromClass = (iconClass?: string) => {
  if (!iconClass) return ''

  const iconPart = iconClass.split(' ').pop()
  if (!iconPart?.startsWith('fa-')) return ''

  return `fa${iconPart
    .split('-')
    .slice(1)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')}`
}

export const getSolidIconClassFromName = (iconName: string) =>
  `fa-solid fa-${iconName.slice(2).replace(/([A-Z])/g, '-$1').toLowerCase()}`

export const loadSolidIcon = async (iconName?: string): Promise<IconDefinition | null> => {
  if (!iconName) return null
  if (iconCache.has(iconName)) return iconCache.get(iconName) ?? null

  const loadIconModule = solidIconModules[`/node_modules/@fortawesome/free-solid-svg-icons/${iconName}.js`]
  if (!loadIconModule) return null

  const iconModule = await loadIconModule()
  const icon = iconModule[iconName] ?? iconModule.definition ?? null
  iconCache.set(iconName, icon)

  return icon
}
