import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './ui/app/index.css'
import App from './ui/app/App'
import { CoreProvider } from './bridge/CoreProvider'
import { I18nProvider } from './ui/i18n/I18nProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CoreProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </CoreProvider>
  </StrictMode>
)
