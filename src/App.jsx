import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import ProtectedRoute from '@/components/ProtectedRoute';
import RoleRouter from '@/components/RoleRouter';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import ChooseRole from '@/pages/ChooseRole';
import Onboarding from '@/pages/Onboarding';
import Join from '@/pages/Join';
import HOALayout from '@/components/HOALayout';
import HomeownerLayout from '@/components/HomeownerLayout';
import HOADashboard from '@/pages/hoa/HOADashboard';
import HOARequests from '@/pages/hoa/HOARequests';
import HOARequestDetail from '@/pages/hoa/HOARequestDetail';
import HOARequestTypes from '@/pages/hoa/HOARequestTypes';
import HOAInvoices from '@/pages/hoa/HOAInvoices';
import HOAExpenses from '@/pages/hoa/HOAExpenses';
import HOAAnnouncements from '@/pages/hoa/HOAAnnouncements';
import HOAPolls from '@/pages/hoa/HOAPolls';
import HOADocuments from '@/pages/hoa/HOADocuments';
import HOACommunity from '@/pages/hoa/HOACommunity';
import HOAEvents from '@/pages/hoa/HOAEvents';
import HOABoard from '@/pages/hoa/HOABoard';
import HOABoardHub from '@/pages/hoa/HOABoardHub';
import HOAHelp from '@/pages/hoa/HOAHelp';
import HOAElections from '@/pages/hoa/HOAElections';
import HomeDashboard from '@/pages/home/HomeDashboard';
import HomeAccount from '@/pages/home/HomeAccount';
import HomeNotifications from '@/pages/home/HomeNotifications';
import HomeRequests from '@/pages/home/HomeRequests';
import HomeNewRequest from '@/pages/home/HomeNewRequest';
import HomeRequestDetail from '@/pages/home/HomeRequestDetail';
import HomeInvoices from '@/pages/home/HomeInvoices';
import HomeExpenses from '@/pages/home/HomeExpenses';
import HomeAnnouncements from '@/pages/home/HomeAnnouncements';
import HomePolls from '@/pages/home/HomePolls';
import HomeDocuments from '@/pages/home/HomeDocuments';
import HomeEvents from '@/pages/home/HomeEvents';
import HomeBoard from '@/pages/home/HomeBoard';
import HomeBoardHub from '@/pages/home/HomeBoardHub';
import HomeHelp from '@/pages/home/HomeHelp';
import HomeElections from '@/pages/home/HomeElections';
import PlanGate from '@/components/PlanGate';
import CommunityLanding from '@/pages/public/CommunityLanding';
import GuestChat from '@/pages/public/GuestChat';
import GuestPay from '@/pages/public/GuestPay';
import PaymentThankYou from '@/pages/public/PaymentThankYou';
import { Navigate } from 'react-router-dom';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/choose-role" element={<ChooseRole />} />

      <Route path="/c/:joinCode" element={<CommunityLanding />} />
      <Route path="/c/:joinCode/chat" element={<GuestChat />} />
      <Route path="/c/:joinCode/pay" element={<GuestPay />} />
      <Route path="/pay/thank-you" element={<PaymentThankYou />} />

      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/" element={<RoleRouter />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/join" element={<Join />} />

        <Route element={<HOALayout />}>
          <Route path="/hoa/dashboard" element={<HOADashboard />} />
          <Route path="/hoa/requests" element={<HOARequests />} />
          <Route path="/hoa/requests/:id" element={<HOARequestDetail />} />
          <Route path="/hoa/request-types" element={<PlanGate module="request_types" homePath="/hoa/dashboard"><HOARequestTypes /></PlanGate>} />
          <Route path="/hoa/invoices" element={<PlanGate module="invoices" homePath="/hoa/dashboard"><HOAInvoices /></PlanGate>} />
          <Route path="/hoa/expenses" element={<PlanGate module="expenses" homePath="/hoa/dashboard"><HOAExpenses /></PlanGate>} />
          <Route path="/hoa/announcements" element={<HOAAnnouncements />} />
          <Route path="/hoa/polls" element={<PlanGate module="polls" homePath="/hoa/dashboard"><HOAPolls /></PlanGate>} />
          <Route path="/hoa/events" element={<HOAEvents />} />
          <Route path="/hoa/elections" element={<PlanGate module="elections" homePath="/hoa/dashboard"><HOAElections /></PlanGate>} />
          <Route path="/hoa/documents" element={<HOADocuments />} />
          <Route path="/hoa/community" element={<HOACommunity />} />
          <Route path="/hoa/board-hub" element={<HOABoardHub />} />
          <Route path="/hoa/board" element={<HOABoard />} />
          <Route path="/hoa/help" element={<HOAHelp />} />
        </Route>

        <Route element={<HomeownerLayout />}>
          <Route path="/home/dashboard" element={<HomeDashboard />} />
          <Route path="/home/account" element={<HomeAccount />} />
          <Route path="/home/notifications" element={<HomeNotifications />} />
          <Route path="/home/requests" element={<HomeRequests />} />
          <Route path="/home/requests/new" element={<HomeNewRequest />} />
          <Route path="/home/requests/:id" element={<HomeRequestDetail />} />
          <Route path="/home/invoices" element={<PlanGate module="invoices" homePath="/home/dashboard"><HomeInvoices /></PlanGate>} />
          <Route path="/home/expenses" element={<PlanGate module="expenses" homePath="/home/dashboard"><HomeExpenses /></PlanGate>} />
          <Route path="/home/announcements" element={<HomeAnnouncements />} />
          <Route path="/home/polls" element={<PlanGate module="polls" homePath="/home/dashboard"><HomePolls /></PlanGate>} />
          <Route path="/home/events" element={<HomeEvents />} />
          <Route path="/home/elections" element={<PlanGate module="elections" homePath="/home/dashboard"><HomeElections /></PlanGate>} />
          <Route path="/home/documents" element={<HomeDocuments />} />
          <Route path="/home/board-hub" element={<HomeBoardHub />} />
          <Route path="/home/board" element={<HomeBoard />} />
          <Route path="/home/help" element={<HomeHelp />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App