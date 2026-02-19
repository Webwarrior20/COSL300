import HomePage from "./pages/HomePage";
import LobbyPage from "./pages/LobbyPage";
import StudentPage from "./pages/StudentPage";
import TeacherPage from "./pages/TeacherPage";

export default function App() {
  const path = window.location.pathname;

  if (path === "/join") return <LobbyPage />;
  if (path === "/admin") return <TeacherPage />;
  if (path === "/game") return <StudentPage />;

  return <HomePage />;
}
