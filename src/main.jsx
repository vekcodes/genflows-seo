import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { CompanyProvider } from './context/CompanyContext.jsx'
import CalendarView from './views/CalendarView.jsx'
import CompaniesView from './views/CompaniesView.jsx'
import AutoresearchView from './views/AutoresearchView.jsx'
import BlogView from './views/BlogView.jsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/calendar" replace /> },
      { path: 'calendar', element: <CalendarView /> },
      { path: 'companies', element: <CompaniesView /> },
      { path: 'autoresearch', element: <AutoresearchView /> },
      { path: 'blog/:blogId', element: <BlogView /> },
    ],
  },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CompanyProvider>
      <RouterProvider router={router} />
    </CompanyProvider>
  </StrictMode>,
)
