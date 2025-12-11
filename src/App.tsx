import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Credentials from "./pages/Credentials";
import Dashboards from "./pages/Dashboards";
import DashboardViewer from "./pages/DashboardViewer";
import UsersManagement from "./pages/UsersManagement";
import Subscription from "./pages/Subscription";
import Settings from "./pages/Settings";
import ReportSubscriptions from "./pages/ReportSubscriptions";
import NotFound from "./pages/NotFound";
import { SupportChat } from "./components/support/SupportChat";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
          <Route path="/settings" element={<Settings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <SupportChat />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
