import { createBrowserRouter } from "react-router";

import SplashPage from "./pages/SplashPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import StudentDashboardPage from "./pages/StudentDashboardPage";
import StudentsPage from "./pages/StudentsPage";
import AddStudentPage from "./pages/AddStudentPage";
import EditStudentPage from "./pages/EditStudentPage";
import StudentProfilePage from "./pages/StudentProfilePage";
import TeacherObservationPage from "./pages/TeacherObservationPage";

import ActivityLibraryPage from "./pages/ActivityLibraryPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import AIActivityGeneratorPage from "./pages/AIActivityGeneratorPage";
import ALPIDashboardPage from "./pages/ALPIDashboardPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";

import ProtectedRoute from "./components/ProtectedRoute";
import RoleProtectedRoute from "./components/RoleProtectedRoute";

import PictureIdentificationGame from "./games/PictureIdentificationGame";
import DragDropGame from "./games/DragandDropGame";
import MemoryGame from "./games/MemoryGame";

import LearningScreenPage from "./pages/LearningScreenPage";
import LearningModulesPage from "./pages/LearningModulesPage";
import LearningModuleDetailsPage from "./pages/LearningModuleDetailsPage";
import TeacherPage from "./pages/TeacherPage";
import StudentPage from "./pages/StudentPage";



const router = createBrowserRouter([
  /* =========================================================
     SPLASH
  ========================================================= */

  {
    path: "/",
    element: <SplashPage />,
  },


  /* =========================================================
     AUTHENTICATION
  ========================================================= */

  {
    path: "/login",
    element: <LoginPage />,
  },

  {
    path: "/register",
    element: <RegisterPage />,
  },


  /* =========================================================
     DASHBOARD
  ========================================================= */

  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },

  {
    path: "/student-dashboard",
    element: (
      <ProtectedRoute>
        <StudentDashboardPage />
      </ProtectedRoute>
    ),
  },


  /* =========================================================
     STUDENTS
  ========================================================= */

  {
    path: "/students",
    element: (
      <RoleProtectedRoute
        roles={["admin", "teacher"]}
      >
        <StudentsPage />
      </RoleProtectedRoute>
    ),
  },


  /* ADD STUDENT */

  {
    path: "/students/add",
    element: (
      <RoleProtectedRoute
        roles={["admin"]}
      >
        <AddStudentPage />
      </RoleProtectedRoute>
    ),
  },


  /* EDIT STUDENT */

  {
    path: "/students/edit/:id",
    element: (
      <RoleProtectedRoute
        roles={["admin", "teacher"]}
      >
        <EditStudentPage />
      </RoleProtectedRoute>
    ),
  },


  /* STUDENT PROFILE */

  {
    path: "/students/:id",
    element: (
      <RoleProtectedRoute
        roles={["admin", "teacher"]}
      >
        <StudentProfilePage />
      </RoleProtectedRoute>
    ),
  },


  /* =========================================================
     TEACHER OBSERVATION
  ========================================================= */

  {
    path: "/students/:studentId/observation",
    element: (
      <RoleProtectedRoute
        roles={["admin", "teacher"]}
      >
        <TeacherObservationPage />
      </RoleProtectedRoute>
    ),
  },


  /* =========================================================
     LEARNING
  ========================================================= */

  {
    path: "/learn/:activityId",
    element: (
      <ProtectedRoute>
        <LearningScreenPage />
      </ProtectedRoute>
    ),
  },


  /* =========================================================
     LEARNING GAMES
  ========================================================= */

  {
    path: "/learn/picture-identification",
    element: (
      <ProtectedRoute>
        <PictureIdentificationGame />
      </ProtectedRoute>
    ),
  },


  {
    path: "/learn/drag-drop",
    element: (
      <ProtectedRoute>
        <DragDropGame />
      </ProtectedRoute>
    ),
  },


  {
    path: "/learn/memory",
    element: (
      <ProtectedRoute>
        <MemoryGame />
      </ProtectedRoute>
    ),
  },


  /* =========================================================
     ACTIVITY LIBRARY
  ========================================================= */

  {
    path: "/activities",
    element: (
      <RoleProtectedRoute
        roles={["admin", "teacher"]}
      >
        <ActivityLibraryPage />
      </RoleProtectedRoute>
    ),
  },


  /* =========================================================
     LEARNING MODULES
  ========================================================= */

  {
    path: "/learning-modules",
    element: (
      <RoleProtectedRoute
        roles={["admin", "teacher"]}
      >
        <LearningModulesPage />
      </RoleProtectedRoute>
    ),
  },


  {
    path: "/learning-modules/:moduleId",
    element: (
      <ProtectedRoute>
        <LearningModuleDetailsPage />
      </ProtectedRoute>
    ),
  },


  /* =========================================================
     ANALYTICS
  ========================================================= */

  {
    path: "/analytics",
    element: (
      <RoleProtectedRoute
        roles={["admin", "teacher"]}
      >
        <ALPIDashboardPage />
      </RoleProtectedRoute>
    ),
  },


  /* =========================================================
     REPORTS
  ========================================================= */

  {
    path: "/reports",
    element: (
      <RoleProtectedRoute
        roles={["admin", "teacher"]}
      >
        <ReportsPage />
      </RoleProtectedRoute>
    ),
  },


  /* =========================================================
     SETTINGS
  ========================================================= */

  {
    path: "/settings",
    element: (
      <RoleProtectedRoute
        roles={["admin", "teacher"]}
      >
        <SettingsPage />
      </RoleProtectedRoute>
    ),
  },


  /* =========================================================
     AI ACTIVITY GENERATOR
  ========================================================= */

  {
    path: "/ai-generator",
    element: (
      <RoleProtectedRoute
        roles={["admin", "teacher"]}
      >
        <AIActivityGeneratorPage />
      </RoleProtectedRoute>
    ),
  },


  /* =========================================================
     ADMIN
  ========================================================= */

  {
    path: "/admin",
    element: (
      <RoleProtectedRoute
        roles={["admin"]}
      >
        <AdminDashboardPage />
      </RoleProtectedRoute>
    ),
  },


  /* =========================================================
     ADAPTIVE LEARNING — NEW FLOWS
  ========================================================= */

  {
    path: "/teacher",
    element: <TeacherPage />,
  },

  {
    path: "/student",
    element: <StudentPage />,
  },


  /* =========================================================
     OPTIONAL 404
  ========================================================= */

  // {
  //   path: "*",
  //   element: <SplashPage />,
  // },
]);


export default router;