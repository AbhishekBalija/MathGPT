import { Outlet } from "react-router-dom";
import { useAdminStore } from "../stores/adminStore";
import AdminPasscodeVerify from "./Admin/AdminPasscodeVerify";

const Admin = () => {
  const { isAdminVerified } = useAdminStore();

  // Show passcode verification if not verified
  if (!isAdminVerified) {
    return (
      <AdminPasscodeVerify
        onVerified={() => {
          // The store already updates isAdminVerified, component will re-render
        }}
      />
    );
  }

  // Show admin dashboard via nested routes
  return <Outlet />;
};

export default Admin;
