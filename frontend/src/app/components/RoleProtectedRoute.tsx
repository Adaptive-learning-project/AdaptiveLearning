import { Navigate } from "react-router";

interface Props {
  children: React.ReactNode;
  roles: string[];
}

/*
 * DEVELOPMENT MODE
 *
 * Set to true while redesigning/testing the frontend.
 * Set to false before deployment.
 */
const DEV_BYPASS_AUTH = true;

export default function RoleProtectedRoute({
  children,
  roles,
}: Props) {

  // Development mode:
  // Allow all roles so every dashboard/page can be previewed.
  if (DEV_BYPASS_AUTH) {
    return <>{children}</>;
  }

  // Original authentication logic
  const token = localStorage.getItem("token");

  let user: any = {};

  try {
    user = JSON.parse(
      localStorage.getItem("user") || "{}"
    );
  } catch {
    user = {};
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!user.role) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}