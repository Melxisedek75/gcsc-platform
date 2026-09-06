import { lazy, Suspense } from 'react'
import { Routes, Route, Outlet } from 'react-router'
import { Loader2 } from 'lucide-react'
import Layout from './components/Layout'
import MarketingLayout from './components/MarketingLayout'
import Home from './pages/Home'

const Pricing = lazy(() => import('./pages/Pricing'))
const About = lazy(() => import('./pages/About'))
const Contact = lazy(() => import('./pages/Contact'))
const Security = lazy(() => import('./pages/Security'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Token = lazy(() => import('./pages/Token'))
const Wallet = lazy(() => import('./pages/Wallet'))
const ContractorProfile = lazy(() => import('./pages/ContractorProfile'))

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-[#7B2FF7]">
      <Loader2 size={22} className="animate-spin" />
    </div>
  )
}

// Premium dark marketing chrome (Kimi design)
function MarketingShell() {
  return (
    <MarketingLayout>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </MarketingLayout>
  )
}

// Functional app chrome (Dashboard / Wallet / profiles)
function AppShell() {
  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </Layout>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<MarketingShell />}>
        <Route path="/" element={<Home />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/about" element={<About />} />
        <Route path="/security" element={<Security />} />
        <Route path="/contact" element={<Contact />} />
      </Route>
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/contractors/:id" element={<ContractorProfile />} />
        <Route path="/token" element={<Token />} />
        <Route path="/wallet" element={<Wallet />} />
      </Route>
    </Routes>
  )
}
