import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Credentials from "./pages/Credentials";
import Dashboards from "./pages/Dashboards";
import DashboardViewer from "./pages/DashboardViewer";
import UsersManagement from "./pages/UsersManagement";
import Subscription from "./pages/Subscription";
import AddUsers from "./pages/AddUsers";
import Settings from "./pages/Settings";
import ReportSubscriptions from "./pages/ReportSubscriptions";
import MasterAdmin from "./pages/MasterAdmin";
import UserGroups from "./pages/UserGroups";
import AccessLogs from "./pages/AccessLogs";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CancellationPolicy from "./pages/CancellationPolicy";
import NotFound from "./pages/NotFound";
import { SupportChat } from "./components/support/SupportChat";
import { ConsentProvider } from "./components/consent/ConsentProvider";

const queryClient = new QueryClient();

// Wrapper to conditionally show SupportChat based on route
const ConditionalSupportChat = () => {
  const location = useLocation();
  
  // Hide support chat on dashboard viewer pages
  const isDashboardViewer = location.pathname.startsWith('/dashboard/') && 
    !location.pathname.includes('/subscriptions');
  
  if (isDashboardViewer) {
    return null;
  }
  
  return <SupportChat />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ConsentProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/home" element={<Home />} />
            <Route path="/credentials" element={<Credentials />} />
            <Route path="/dashboards" element={<Dashboards />} />
            <Route path="/dashboard/:id" element={<DashboardViewer />} />
            <Route path="/dashboard/:dashboardId/subscriptions" element={<ReportSubscriptions />} />
            <Route path="/users" element={<UsersManagement />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/add-users" element={<AddUsers />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/master-admin" element={<MasterAdmin />} />
            <Route path="/groups" element={<UserGroups />} />
            <Route path="/access-logs" element={<AccessLogs />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/cancellation-policy" element={<CancellationPolicy />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <ConditionalSupportChat />
        </ConsentProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
