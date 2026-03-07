import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { AuthProvider, ProtectedRoute } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './components/ui/Toast';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import CustomersPage from './pages/customers/CustomersPage';
import CustomerDetailPage from './pages/customers/CustomerDetailPage';
import JobsPage from './pages/jobs/JobsPage';
import JobDetailPage from './pages/jobs/JobDetailPage';
import SchedulePage from './pages/schedule/SchedulePage';
import InventoryPage from './pages/inventory/InventoryPage';
import QuotesPage from './pages/quotes/QuotesPage';
import InvoicesPage from './pages/invoices/InvoicesPage';
import ContractsPage from './pages/contracts/ContractsPage';
import CrewsPage from './pages/crews/CrewsPage';
import EquipmentPage from './pages/equipment/EquipmentPage';
import LeadsPage from './pages/marketing/LeadsPage';
import ProspectsPage from './pages/marketing/ProspectsPage';
import CampaignsPage from './pages/marketing/CampaignsPage';
import DirectMailPage from './pages/marketing/DirectMailPage';
import PhotosPage from './pages/photos/PhotosPage';
import ReportsPage from './pages/reports/ReportsPage';
import SettingsPage from './pages/settings/SettingsPage';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/customers': 'Customers',
  '/jobs': 'Jobs',
  '/schedule': 'Schedule',
  '/inventory': 'Inventory',
  '/quotes': 'Quotes',
  '/invoices': 'Invoices',
  '/contracts': 'Contracts',
  '/crews': 'Crews',
  '/equipment': 'Equipment',
  '/leads': 'Leads',
  '/prospects': 'Prospects',
  '/campaigns': 'Campaigns',
  '/direct-mail': 'Direct Mail',
  '/photos': 'Photos',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  const baseRoute = '/' + (location.pathname.split('/')[1] || '');
  const title = pageTitles[baseRoute] || 'Maas Verde CRM';

  return (
    <div className="flex min-h-screen bg-earth-950">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(c => !c)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title={title} />
        <main className="flex-1 p-4 lg:p-6">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/customers/:id" element={<CustomerDetailPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/jobs/:id" element={<JobDetailPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/quotes" element={<QuotesPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/contracts" element={<ContractsPage />} />
            <Route path="/crews" element={<CrewsPage />} />
            <Route path="/equipment" element={<EquipmentPage />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/prospects" element={<ProspectsPage />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/direct-mail" element={<DirectMailPage />} />
            <Route path="/photos" element={<PhotosPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <DataProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </DataProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
