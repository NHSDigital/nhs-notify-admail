import './App.css';
import { useState } from "react";
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import AIFeedback from './components/AIfeedback';
import axios from 'axios';
import RoyalMailCalculator from './components/Costingtool';
import { AuthProvider, useAuth } from './components/AuthContext';
import Login from './components/Login';


function App() {
  const [feedback, setFeedback] = useState({});
  const EnvLambdaFunctionApiBaseUrl = process.env.REACT_APP_LAMBDA_API_BASE_URL || '';

  const { isAuthenticated, logout } = useAuth()
  if (!isAuthenticated) {
    return <Login />;
  }

  const getPromptResp =  async (file) => {
      // Read file content if it's a File object
    let fileContent = typeof file === 'string' ? file : await file.text();
    const response = await axios.post(
      `${EnvLambdaFunctionApiBaseUrl}`, // hitting the App runner endpoint
      {"input_text": fileContent}
    );
    // Parse the string to JSON
    let cleanedData = response.data;
    try {
      cleanedData = cleanedData.replace('```', '').replace(/`/g, '').replace('<', '').replace('>', '').replace('|', '');
      
    } catch (error) {
      console.log('error removing punctuation from string either does not exist or cannot remove');
    }
    try {
      cleanedData = cleanedData.replace('json', '');
    } catch (error) {
      console.log('error removing "json" from string either does not exist or cannot remove');
    }
    try {
      cleanedData = JSON.parse(cleanedData);
    } catch (error) {
      console.error('Error parsing JSON:', error);
    }
    return cleanedData;
  }

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

export default function AppWithProvider() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}