import PropTypes from 'prop-types'
import ServiceItem from './ServiceItem'

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPhotoVideo, faStream, faServer, faHome } from "@fortawesome/free-solid-svg-icons";
const ServiceCategory = ({ category }) => {
  // 根据类别名称选择图标
  const getIcon = (categoryName) => {
    switch(categoryName.toLowerCase()) {
      case 'media':
        return <FontAwesomeIcon icon={faPhotoVideo} />;
      case 'services':
        return <FontAwesomeIcon icon={faStream} />;
      case 'system':
        return <FontAwesomeIcon icon={faServer} />;
      case 'home automation':
        return <FontAwesomeIcon icon={faHome} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col w-full p-3">
      <h2 className="group-title truncate text-2xl mt-6 mb-5 flex items-center">
        <span className="fa-lg pr-1">
          {getIcon(category.name)}
        </span>
        {category.name}
      </h2>
      <ul>
        {category.list.map((service, index) => (
          <li key={index}>
            <ServiceItem service={service} />
          </li>
        ))}
      </ul>
    </div>
  )
}

ServiceCategory.propTypes = {
  category: PropTypes.shape({
    name: PropTypes.string.isRequired,
    icon: PropTypes.string,
    list: PropTypes.array.isRequired
  }).isRequired
}

export default ServiceCategory 