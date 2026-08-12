import { Navigate } from "react-router";

interface Props {
  children: React.ReactNode;
}

/*
 * DEVELOPMENT MODE
 *
 * Set to true while redesigning/testing the frontend.
 * Set to false when real authentication should be enforced.
 */
const DEV_BYPASS_AUTH = true;

export default function ProtectedRoute({ children }: Props) {
  // Development mode: allow direct access to protected pages
  if (DEV_BYPASS_AUTH) {
    return <>{children}</>;
  }

  // Original authentication logic
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}