import { useState } from "react";
import "./FileUpload.css";
import { useBackendAPIClient } from "../api/BackendAPIClient";

const SUPPORTED_EXTENSIONS = [
  'docx', 'md', 'txt', 'odt', 'pdf'
];

export default function FileUpload({ onFileUpload, handleLoading }) {
  const [uploadStatus, setUploadStatus] = useState("");
  const backendAPIClient = useBackendAPIClient();

  const acceptString = SUPPORTED_EXTENSIONS.map(ext => `.${ext}`).join(',');

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      setUploadStatus("No file selected");
      setTimeout(() => setUploadStatus(""), 2000);
      return;
    }

    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(fileExtension)) {
      setUploadStatus(`Error: .${fileExtension} files are not supported.`);
      setTimeout(() => setUploadStatus(""), 4000);
      event.target.value = null;
      return;
    }

    setUploadStatus("Uploading...");
    handleLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      let fr = new FileReader()
      fr.readAsDataURL(file);
      fr.addEventListener('load', (_evt) => onFileUpload({ extracted_text: fr.result, file_name: file.name }));

      setUploadStatus("Successfully Uploaded");
      setTimeout(() => setUploadStatus(""), 2000);
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadStatus(error.message || "Upload Failed");
      setTimeout(() => setUploadStatus(""), 2000);
      handleLoading(false);
    }
  };

  return (
    <div className="file-upload">
      <h2 style={{ fontWeight: "bold", fontSize: "24px", color: "#000" }}>
        Admail Eligibility Checker
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

      <input
        type="file"
        onChange={handleFileChange}
        className="file-upload"
        accept={acceptString}
      />

      {uploadStatus && (
        <p
          className={
            uploadStatus.includes("Failed") || uploadStatus.includes("Error")
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
