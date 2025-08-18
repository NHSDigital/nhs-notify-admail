import { useState } from "react";
import "./FileUpload.css";
import { useBackendAPIClient } from "../api/BackendAPIClient";

export default function FileUpload({ onFileUpload, handleLoading }) {
  const [uploadStatus, setUploadStatus] = useState("");
  const backendAPIClient = useBackendAPIClient();

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      setUploadStatus("No file selected");
      setTimeout(() => setUploadStatus(""), 2000);
      return;
    }

    setUploadStatus("Uploading...");
    handleLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await backendAPIClient.post(
        `/convert`,
        formData,
      );

      console.log("API Response:", response.data); // Debug the response

      if (!response.data) {
        throw new Error("Empty response from API");
      }

      const resolvedData = await Promise.resolve(response.data); // Handle potential Promise
      setUploadStatus("Successfully Uploaded");
      onFileUpload(resolvedData);
      setTimeout(() => setUploadStatus(""), 2000);
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadStatus(error.message || "Upload Failed");
      setTimeout(() => setUploadStatus(""), 2000);
    }
  };

  return (
    <div className="file-upload">
      <h2 style={{ fontWeight: "bold", fontSize: "24px", color: "#000" }}>
        Upload File
      </h2>
      <p>
        Upload your template to have the letter content assessed. This service
        will provide feedback and suggest the most appropriate Royal Mail
        service to send the letters. NotifAI will provide you a reason for
        choosing the returned rating and provide some advice on improving your
        template to tailor it to better suit Admail or Business Mail mailtype.
        <br />
        <br />
        <span style={{ fontWeight: "bold", fontSize: "24px", color: "#000" }}>
          Rating Description:
        </span>
        <br />
        <br />
        <span style={{ fontWeight: "bold", color: "#005eb8" }}>BUSINESS</span>:
        Use a Business Mail product for this mail.
        <br />
        <br />
        <span style={{ fontWeight: "bold", color: "#ff7900" }}>UNSURE</span>: It
        is unclear as to whether this letter should be sent as Admail or
        Business Mail.
        <br />
        <br />
        <span style={{ fontWeight: "bold", color: "#008000" }}>
          ADVERTISING
        </span>
        : This letter is suitable for Admail.
      </p>

      <input type="file" onChange={handleFileChange} className="file-upload" />
      {uploadStatus && (
        <p
          className={
            uploadStatus.includes("Failed")
              ? "error-message"
              : "success-message"
          }
        >
          {uploadStatus}
        </p>
      )}
    </div>
  );
}
