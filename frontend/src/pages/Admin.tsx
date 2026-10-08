import { Outlet } from "react-router-dom";

// The admin dashboard. ProtectedRoute (adminOnly) has already checked that the
// signed-in User is an Admin; there is no second passcode (#20).
const Admin = () => <Outlet />;

export default Admin;
