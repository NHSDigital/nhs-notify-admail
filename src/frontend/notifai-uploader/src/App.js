import "./App.css";
import { useState } from "react";
import Header from "./components/Header.js";
import FileUpload from "./components/FileUpload.js";
import AIFeedback from "./components/AIfeedback.js";
import axios from "axios";
import RoyalMailCalculator from "./components/Costingtool.js";
import Login from "./components/Login.js";
import { useAuth } from "./components/AuthContext.js";

function App() {
  const [feedback, setFeedback] = useState({});
  const [pages, setPages] = useState(0);
  const [letterType, setLetterType] = useState("");
  const EnvLambdaFunctionApiBaseUrl = window.env?.REACT_APP_API_GATEWAY || process.env.REACT_APP_API_GATEWAY;
  const { user } = useAuth();
  const [isLoading, setLoading] = useState(false);

  if (!user) {
    return <Login />;
  }

  const getPromptResp = async (file) => {
    let fileContent = typeof file === "string" ? file : await file.text();
    try {
      const response = await axios.post(
        `${EnvLambdaFunctionApiBaseUrl}`,
        { input_text: fileContent },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.idToken}`,
          },
        }
      );
      return response.data;
    } catch (err) {
      throw new Error("Error calling Lambda or session expired. Please log in again.");
    }
  };

  const handleLoading = (loading) => {
    setLoading(loading);
  }

  const handleFileUpload = (file) => {
    setTimeout(() => {
      setLetterType(file.file_type || "docx");
      if (file.file_type !== "docx") {
        setPages(file.pages);
      }
      const promptResp = getPromptResp(file.extracted_text);
      setFeedback(promptResp);
    }, 1000); // Simulate processing delay
  };



  return (
    <div>
      <Header />
      <main className="container">
        <div className="two-column-content">
          <FileUpload onFileUpload={handleFileUpload} handleLoading={handleLoading}/>
          <AIFeedback feedback={feedback} isLoading={isLoading}/>
        </div>
        <RoyalMailCalculator pages={pages} letterType={letterType}/>
      </main>
    </div>
  );
}

export default App;
