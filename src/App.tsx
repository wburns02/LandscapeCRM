import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { AuthProvider, ProtectedRoute } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './components/ui/Toast';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import CommandCenterPage from './pages/command-center/CommandCenterPage';
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
import RecurringServicesPage from './pages/services/RecurringServicesPage';
import TimeTrackingPage from './pages/time-tracking/TimeTrackingPage';
import ProposalBuilderPage from './pages/proposals/ProposalBuilderPage';
import CustomerPortalPage from './pages/portal/CustomerPortalPage';
import ExpensesPage from './pages/expenses/ExpensesPage';
import JobCostingPage from './pages/job-costing/JobCostingPage';
import RecurringBillingPage from './pages/billing/RecurringBillingPage';
import SalesPipelinePage from './pages/pipeline/SalesPipelinePage';
import RoutePlannerPage from './pages/route-planner/RoutePlannerPage';
import BusinessInsightsPage from './pages/insights/BusinessInsightsPage';
import SmartEstimatorPage from './pages/estimator/SmartEstimatorPage';
import WeatherCommandPage from './pages/weather/WeatherCommandPage';
import CrewFieldHub from './pages/crew-hub/CrewFieldHub';
import RevenueAutopilot from './pages/autopilot/RevenueAutopilot';
import CustomerEngagementHub from './pages/engagement/CustomerEngagementHub';
import PropertyIntelligence from './pages/properties/PropertyIntelligence';
import DailyCloseout from './pages/closeout/DailyCloseout';
import SafetyComplianceCommand from './pages/compliance/SafetyComplianceCommand';
import SettingsPage from './pages/settings/SettingsPage';
import LiveDispatchMap from './pages/dispatch/LiveDispatchMap';
import InvoiceFollowUp from './pages/invoices/InvoiceFollowUp';
import CustomerSatisfaction from './pages/satisfaction/CustomerSatisfaction';
import ServiceBookingManager from './pages/booking/ServiceBookingManager';
import IntegrationsHub from './pages/integrations/IntegrationsHub';
import ServicePriceBook from './pages/pricebook/ServicePriceBook';
import VendorPurchaseOrders from './pages/vendors/VendorPurchaseOrders';

const pageTitles: Record<string, string> = {
  '/': 'Command Center',
  '/customers': 'Customers',
  '/jobs': 'Jobs',
  '/schedule': 'Schedule',
  '/recurring-services': 'Recurring Services',
  '/inventory': 'Inventory',
  '/quotes': 'Quotes',
  '/invoices': 'Invoices',
  '/contracts': 'Contracts',
  '/crews': 'Crews',
  '/time-tracking': 'Time Tracking',
  '/equipment': 'Equipment',
  '/leads': 'Leads',
  '/prospects': 'Prospects',
  '/campaigns': 'Campaigns',
  '/direct-mail': 'Direct Mail',
  '/proposals': 'Proposals',
  '/expenses': 'Expenses',
  '/job-costing': 'Job Costing',
  '/recurring-billing': 'Recurring Billing',
  '/pipeline': 'Sales Pipeline',
  '/estimator': 'Smart Estimator',
  '/weather': 'Weather Command',
  '/crew-hub': 'Crew Field Hub',
  '/autopilot': 'Revenue Autopilot',
  '/engagement': 'Engagement Hub',
  '/properties': 'Property Intelligence',
  '/closeout': 'Daily Closeout',
  '/compliance': 'Safety & Compliance',
  '/reminders': 'Invoice Follow-Up',
  '/satisfaction': 'Customer Satisfaction',
  '/booking': 'Service Requests',
  '/integrations': 'Integrations Hub',
  '/price-book': 'Service Price Book',
  '/vendors': 'Vendors & POs',
  '/dispatch': 'Live Dispatch',
  '/route-planner': 'Route Planner',
  '/insights': 'Business Intelligence',
  '/photos': 'Photos',
  '/portal': 'Customer Portal',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

const FULL_SCREEN_ROUTES = ['/dispatch'];

function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  const baseRoute = '/' + (location.pathname.split('/')[1] || '');
  const title = pageTitles[baseRoute] || 'Maas Verde CRM';
  const isFullScreen = FULL_SCREEN_ROUTES.includes(baseRoute);

  return (
    <div className="flex min-h-screen bg-earth-950">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(c => !c)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar title={title} />
        <main className={isFullScreen ? 'flex-1 overflow-hidden' : 'flex-1 p-4 lg:p-6'}>
          <Routes>
            <Route path="/" element={<CommandCenterPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/customers/:id" element={<CustomerDetailPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/jobs/:id" element={<JobDetailPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/recurring-services" element={<RecurringServicesPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/quotes" element={<QuotesPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/contracts" element={<ContractsPage />} />
            <Route path="/crews" element={<CrewsPage />} />
            <Route path="/time-tracking" element={<TimeTrackingPage />} />
            <Route path="/equipment" element={<EquipmentPage />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/prospects" element={<ProspectsPage />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/direct-mail" element={<DirectMailPage />} />
            <Route path="/proposals" element={<ProposalBuilderPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/job-costing" element={<JobCostingPage />} />
            <Route path="/recurring-billing" element={<RecurringBillingPage />} />
            <Route path="/pipeline" element={<SalesPipelinePage />} />
            <Route path="/route-planner" element={<RoutePlannerPage />} />
            <Route path="/insights" element={<BusinessInsightsPage />} />
            <Route path="/estimator" element={<SmartEstimatorPage />} />
            <Route path="/weather" element={<WeatherCommandPage />} />
            <Route path="/crew-hub" element={<CrewFieldHub />} />
            <Route path="/autopilot" element={<RevenueAutopilot />} />
            <Route path="/engagement" element={<CustomerEngagementHub />} />
            <Route path="/properties" element={<PropertyIntelligence />} />
            <Route path="/closeout" element={<DailyCloseout />} />
            <Route path="/compliance" element={<SafetyComplianceCommand />} />
            <Route path="/reminders" element={<InvoiceFollowUp />} />
            <Route path="/satisfaction" element={<CustomerSatisfaction />} />
            <Route path="/booking" element={<ServiceBookingManager />} />
            <Route path="/integrations" element={<IntegrationsHub />} />
            <Route path="/price-book" element={<ServicePriceBook />} />
            <Route path="/vendors" element={<VendorPurchaseOrders />} />
            <Route path="/dispatch" element={<LiveDispatchMap />} />
            <Route path="/photos" element={<PhotosPage />} />
            <Route path="/portal" element={<CustomerPortalPage />} />
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
