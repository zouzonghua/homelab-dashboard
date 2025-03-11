import PropTypes from 'prop-types'
import ServiceCategory from './ServiceCategory'

const ServiceGrid = ({ categories, columns }) => {
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

  return (
    <ul className="container dark:text-white max-w-screen-xl p-2 xl:p-0 xl:mt-6 flex flex-wrap">
      {categories.map((category, index) => (
        <li key={index} className={`flex flex-col ${getColumnClass()}`}>
          <ServiceCategory category={category} />
        </li>
      ))}
    </ul>
  )
}

ServiceGrid.propTypes = {
  categories: PropTypes.array.isRequired,
  columns: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
}

export default ServiceGrid 