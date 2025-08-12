import { useState } from 'react';
import axios from 'axios'; // Import axios for HTTP requests
import './FileUpload.css';
import { useAuth } from './AuthContext';

export default function FileUpload({ onFileUpload }) {
  const [uploadStatus, setUploadStatus] = useState('');
  const { user } = useAuth();
  const EnvBackendApiBaseUrl = window.env?.REACT_APP_BACKEND_API_BASE_URL || process.env.REACT_APP_BACKEND_API_BASE_URL;

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadStatus('Uploading...');
      try {
        // Create FormData to send the file
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post(
          `https://${EnvBackendApiBaseUrl}/convert`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              'Authorization': `Bearer ${user.idToken}`,
            },
          }
        );
        setUploadStatus('Successfully Uploaded');

        onFileUpload(response.data); // Call the parent callback
        setTimeout(() => setUploadStatus(''), 3000); // Clear status after 3 seconds
      } catch (error) {
        console.error('Upload failed:', error);
        setUploadStatus('Upload Failed');
        setTimeout(() => setUploadStatus(''), 3000);
      }
    }
  };


  return (
    <div className="file-upload">
      <h2 style={{ fontWeight: 'bold', fontSize: '24px', color: '#000' }}>Upload File</h2>
      <p>Upload your template to have the letter content assessed. This service will provide feedback and suggest the most appropriate Royal Mail service to send the letters.
        NotifAI will provide you a reason for choosing the returned rating and provide some advice on improving your template to tailor it to better suit Admail or Business Mail mailtype.
        <br /><br />
        <span style={{ fontWeight: 'bold', fontSize: '24px', color: '#000' }}>Rating Description:</span>
        <br /><br />
        <span style={{ fontWeight: 'bold', color: '#005eb8' }}>BUSINESS</span>: Use a Business Mail product for this mail.
        <br /><br />
        <span style={{  fontWeight: 'bold', color: '#ff7900' }}>UNSURE</span>: It is unclear as to whether this letter should be sent as Admail or Business Mail.
        <br /><br />
        <span style={{ fontWeight: 'bold', color: '#008000' }}>ADVERTISING</span>: This letter is suitable for Admail.
      </p>

      <input type="file" onChange={handleFileChange} className='file-upload'/>
      {uploadStatus && <p className={uploadStatus.includes('Failed') ? 'error-message' : 'success-message'}>{uploadStatus}</p>}
    </div>
  );
}
