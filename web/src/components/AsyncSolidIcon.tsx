import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { FontAwesomeIconProps } from '@fortawesome/react-fontawesome'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faFolder } from '@fortawesome/free-solid-svg-icons/faFolder'
import { loadSolidIcon } from '../utils/fontawesomeIcons'

type AsyncSolidIconProps = Omit<FontAwesomeIconProps, 'icon'> & {
  iconName?: string
  fallbackIcon?: IconDefinition
}

const AsyncSolidIcon = ({ iconName, fallbackIcon = faFolder, ...props }: AsyncSolidIconProps) => {
  const [icon, setIcon] = useState<IconDefinition | null>(null)

  useEffect(() => {
    let isMounted = true

    setIcon(null)
    loadSolidIcon(iconName).then((loadedIcon) => {
      if (isMounted) {
        setIcon(loadedIcon)
      }
    })

    return () => {
      isMounted = false
    }
  }, [iconName])

  return <FontAwesomeIcon icon={icon || fallbackIcon} {...props} />
}

export default AsyncSolidIcon
