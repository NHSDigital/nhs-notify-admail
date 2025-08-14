import './App.css';
import { useState } from "react";
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import AIFeedback from './components/AIfeedback';
import axios from 'axios';
import RoyalMailCalculator from './components/Costingtool';
import { useAuth } from './components/AuthContext';
import Login from './components/Login';


function App() {
  const [feedback, setFeedback] = useState({});
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
      if (response.status !== 401) {
        return response.data;
      }
    } catch (err) {
      throw new Error("Error calling Lambda or session expired. Please log in again.");
    }
  };

  const handleLoading = (loading) => {
    setLoading(loading);
  }

  const handleFileUpload = async (file) => {
    try {
      const promptData = await getPromptResp(file);
      setFeedback(promptData);
      setLoading(false);
    } catch (err) {
      console.error("Failed to get AI feedback:", err);
      setFeedback({});
    }
  };



  return (
    <div>
      <Header />
      <main className="container">
        <div className="two-column-content">
          <FileUpload onFileUpload={handleFileUpload} handleLoading={handleLoading}/>
          <AIFeedback feedback={feedback} isLoading={isLoading}/>
        </div>
        <RoyalMailCalculator />
      </main>
    </div>
  );
}

export default App;
