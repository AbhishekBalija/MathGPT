import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Admin from "./pages/Admin";
import AppLayout from "./pages/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import {
  AdminLayout,
  Dashboard,
  Users,
  Errors,
  Analytics,
} from "./pages/Admin/index";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* Admin Routes with nested layout */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <Admin />
            </ProtectedRoute>
          }
        >
          <Route element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="errors" element={<Errors />} />
            <Route path="analytics" element={<Analytics />} />
          </Route>
        </Route>
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
