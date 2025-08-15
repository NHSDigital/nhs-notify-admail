import "./App.css";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import FileUploadPage from "./components/FileUploadPage";
import History from "./components/History";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<FileUploadPage />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </Router>
  );
}

export default App;
