import { useState, useEffect } from 'react'
import Header from './components/Header'
import ServiceGrid from './components/ServiceGrid'
import { fetchConfig } from './utils/api'

function App() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const data = await fetchConfig()
        setConfig(data)
        // 设置页面标题
        document.title = data.title || "HomeLab Dashboard"
      } catch (err) {
        setError('配置加载失败')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadConfig()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-screen dark:bg-dark-900">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  )
  
  if (error) return (
    <div className="flex items-center justify-center h-screen dark:bg-dark-900">
      <div className="text-red-500 text-xl">{error}</div>
    </div>
  )

  return (
    <div className="bg-gray-50 dark:text-white dark:bg-dark-900 xl:h-screen w-screen flex flex-col items-center xl:flex-col">
      <Header title={config?.title || "HomeLab Dashboard"} />
      <ServiceGrid categories={config?.items || []} columns={config?.columns || 4} />
    </div>
  )
}

export default App
