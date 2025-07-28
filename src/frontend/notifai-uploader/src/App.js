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
  const EnvLambdaFunctionApiBaseUrl = process.env.REACT_APP_LAMBDA_API_BASE_URL || '';
  const { user, refreshSession } = useAuth();

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
      await refreshSession();
      const refreshResponse = await axios.post(
        `${EnvLambdaFunctionApiBaseUrl}`,
        { input_text: fileContent },
        {
          headers: {
            Authorization: `Bearer ${user.idToken}`,
          },
        }
      );
      return refreshResponse.data;
    } catch (err) {
      throw new Error("Error calling Lambda or session expired. Please log in again.");
    }
  };

  const handleFileUpload = (file) => {
    setTimeout(() => {
      const promptresp = getPromptResp(file);
      setFeedback(promptresp);
    }, 1000); // Simulate processing delay
  };

  return (
    <div>
      <Header />
      <main className="container">
        <div className="two-column-content">
          <FileUpload onFileUpload={handleFileUpload} />
          <AIFeedback feedback={feedback} />
        </div>
        <RoyalMailCalculator />
      </main>
    </div>
  );
}

export default App;
