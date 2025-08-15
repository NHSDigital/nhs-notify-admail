import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { withAuth } from "./AuthContext";

function History({ user }) {
  const [files, setFiles] = useState([]);
  const [nextStartAfter, setNextStartAfter] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get("/s3/history", {
        params: {
          batch: 10,
          start_after: nextStartAfter,
        },
        headers: {
          Authorization: `Bearer ${user.idToken}`,
        },
      });
      setFiles((prevFiles) => [...prevFiles, ...response.data]);
      if (response.data.length > 0) {
        setNextStartAfter(response.data[response.data.length - 1].name);
      }
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setLoading(false);
    }
  }, [nextStartAfter, user.idToken]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const downloadFile = async (fileName) => {
    try {
      const response = await axios.get(`/s3/download/${fileName}`, {
        headers: {
          Authorization: `Bearer ${user.idToken}`,
        },
      });
      window.location.href = response.data.download_url;
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  };

  return (
    <div>
      <main className="container">
        <div className="two-column-content">
          <h1>History of File Uploads</h1>
          <p>This page will display the history of file uploads.</p>
          <table>
            <thead>
              <tr>
                <th>File Name</th>
                <th>Last Modified</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file, index) => (
                <tr key={index}>
                  <td>{file.name}</td>
                  <td>{file.last_modified}</td>
                  <td>
                    <button onClick={() => downloadFile(file.name)}>Download</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <button onClick={fetchFiles} disabled={loading}>
              Load More
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

export default withAuth(History);
