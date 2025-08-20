import React, { useState } from "react";
import FileUpload from "../components/FileUpload";
import AIFeedback from "../components/AIfeedback";
import RoyalMailCalculator from "../components/Costingtool";
import { withAuth, useAuth } from "../components/AuthContext";
import axios from "axios";

function FileUploadPage() {
  const [feedback, setFeedback] = useState({});
  const [pages, setPages] = useState(0);
  const [letterType, setLetterType] = useState("");
  const [isLoading, setLoading] = useState(false);
  const EnvLambdaFunctionApiBaseUrl = window.env?.REACT_APP_API_GATEWAY || process.env.REACT_APP_API_GATEWAY;
  const { user } = useAuth();


  const getPromptResp = async (fileContent, fileName) => {
    try {
      const response = await axios.post(
        `${EnvLambdaFunctionApiBaseUrl}`,
        { input_text: fileContent, file_name: fileName},
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

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const handleFileUpload = async (file) => {
    setLoading(true);
    setFeedback({});
    setLetterType(file.file_type || "docx");
    if (file.file_type !== "docx") {
      setPages(file.pages);
    }
    try {
      const promptResp = await getPromptResp(file.extracted_text, file.file_name);
      await sleep(1000);
      setFeedback(promptResp);
    } catch (error) {
      console.log("Error in handleFileUpload:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <main className="container">
        <div className="two-column-content">
          <FileUpload onFileUpload={handleFileUpload} handleLoading={handleLoading} />
          <AIFeedback feedback={feedback} isLoading={isLoading} />
        </div>
        <RoyalMailCalculator pages={pages} letterType={letterType} />
      </main>
    </div>
  );
}

export default withAuth(FileUploadPage);
