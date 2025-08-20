import React, { useState, useEffect, useCallback } from "react";
import { withAuth } from "../components/AuthContext";
import { useBackendAPIClient } from '../api/BackendAPIClient';
import AIFeedback from "../components/AIfeedback";

const ITEMS_PER_PAGE = 10;

function History({ user }) {
  const backendAPIClient = useBackendAPIClient();
  const [allFiles, setAllFiles] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [nextStartAfter, setNextStartAfter] = useState(null);
  const [isLoading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchFiles = useCallback(async (startAfter, isInitialLoad = false) => {
    setLoading(true);
    try {

      const response = await backendAPIClient.get('/s3/history', {
        params: {
          batch: isInitialLoad ? ITEMS_PER_PAGE+11 : ITEMS_PER_PAGE,
          start_after: startAfter,
        },
      });

      const newFiles = response.data;

      setAllFiles(prevFiles => {
        if (newFiles.length > 0) {
          return [...prevFiles, ...newFiles];
        }
        return prevFiles;
      });

      if (newFiles.length > 0) {
        setNextStartAfter(newFiles[newFiles.length - 1].name);
      }

      if (newFiles.length < (ITEMS_PER_PAGE)) {
        setHasMore(false);
      }

      if (isInitialLoad && newFiles.length > 0) {
        setCurrentPage(1);
      }

    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  }, [backendAPIClient]);

  useEffect(() => {
    fetchFiles(null, true);
  }, [fetchFiles]);

  const handleLoadMore = () => {
    fetchFiles(nextStartAfter);
  };

  const fetchAndShowFileContent = async (fileName) => {
    setLoading(true);
    setFeedback(null);
    try {
      const response = await backendAPIClient.get('/s3/download', {
        params: {
          file_name: fileName,
        },
      });

      const fileData = response.data;

      if (fileData && fileData.prompt_output && fileData.prompt_output.body) {
        const bodyData = JSON.parse(fileData.prompt_output.body);
        setFeedback(bodyData);
      }
    } catch (error) {
      console.error('Error fetching file content:', error);
    } finally {
      setLoading(false);
    }
  };

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentFiles = allFiles.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const totalPages = Math.ceil(allFiles.length / ITEMS_PER_PAGE);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const paginationButtons = [];
  for (let i = 1; i <= totalPages; i++) {
    paginationButtons.push(
      <button
        key={i}
        onClick={() => handlePageChange(i)}
        className={currentPage === i ? "active" : ""}
      >
        {i}
      </button>
    );
  }

  return (
    <div>
      <main className="container">
        <div className="two-column-content">
          <table>
            <thead>
              <tr>
                <th>File Name</th>
                <th>Date Uploaded</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {currentFiles.map((file, index) => (
                <tr key={index}>
                  <td>
                    {file.name.split('__')[1] || ''}
                  </td>
                  <td>{file.last_modified}</td>
                  <td>
                    <button onClick={() => fetchAndShowFileContent(file.name)}>View Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <AIFeedback feedback={feedback} isLoading={isLoading} />
        </div>
        <div className="pagination-controls">
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              {paginationButtons}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
          {hasMore && (
            <div style={{ marginTop: '10px' }}>
              {isLoading ? (
                <p>Loading...</p>
              ) : (
                  <button onClick={handleLoadMore} disabled={isLoading}>
                    Load 10 more assessment files
                  </button>
              )}
            </div>
          )}
          {!hasMore && (
            <div style={{ marginTop: '10px' }}>
              <p>No more assessment files to load</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default withAuth(History);
