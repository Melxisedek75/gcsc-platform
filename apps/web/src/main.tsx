import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router'
import './index.css'
import App from './App.tsx'

const router = createHashRouter([{ path: '*', element: <App /> }])

createRoot(document.getElementById('root')!).render(<RouterProvider router={router} />)
