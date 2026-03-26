import './App.css';
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import FileUploadPage from "./Pages/FileUploadPage";
import History from "./Pages/History";
import Header from "./components/Header";
import Login from "./components/Login";
import { useAuth } from "./components/AuthContext";

function App() {
  const { user } = useAuth();

  if (!user) {
    return <Login />;
  }

  return (
    <Router>
      <Header />
      <main className="container">
        <Routes>
          <Route path="/" element={<FileUploadPage />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
