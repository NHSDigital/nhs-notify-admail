import React, { useState } from "react";
import FileUpload from "./FileUpload";
import AIFeedback from "./AIfeedback";
import RoyalMailCalculator from "./Costingtool";
import { withAuth } from "./AuthContext";
import axios from "axios";

function FileUploadPage({ user }) {
  const [feedback, setFeedback] = useState({});
  const [isLoading, setLoading] = useState(false);
  const EnvLambdaFunctionApiBaseUrl = window.env?.REACT_APP_API_GATEWAY || process.env.REACT_APP_API_GATEWAY;

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
  };

  const handleFileUpload = async (file) => {
    try {
      handleLoading(true);
      const promptData = await getPromptResp(file);
      setFeedback(promptData);
      handleLoading(false);
    } catch (err) {
      console.error("Failed to get AI feedback:", err);
      setFeedback({});
      handleLoading(false);
    }
  };

  return (
    <div>
      <main className="container">
        <div className="two-column-content">
          <FileUpload onFileUpload={handleFileUpload} handleLoading={handleLoading} />
          <AIFeedback feedback={feedback} isLoading={isLoading} />
        </div>
        <RoyalMailCalculator />
      </main>
    </div>
  );
}

export default withAuth(FileUploadPage);
