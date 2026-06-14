import React from 'react'
import ReactDOM from 'react-dom/client'
import { AppProviders } from './providers/AppProviders'
import './styles/index.css'
import { DashboardPage } from '@/pages/dashboard'

const root = document.getElementById('root')

if (!root) {
  throw new Error('Root element #root not found')
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <AppProviders>
      <DashboardPage />
    </AppProviders>
  </React.StrictMode>,
) 
