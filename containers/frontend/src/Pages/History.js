import React, { useState, useEffect, useCallback } from "react";
import { useBackendAPIClient } from "../api/BackendAPIClient";
import AIFeedback from "../components/AIfeedback";

const ITEMS_PER_PAGE = 10;

function History() {
  const backendAPIClient = useBackendAPIClient();
  const [allFiles, setAllFiles] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchAllFiles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await backendAPIClient.get("/s3/history");
      const files = response.data;
      setAllFiles(files);
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setLoading(false);
    }
  }, [backendAPIClient]);

  useEffect(() => {
    fetchAllFiles();
  }, [fetchAllFiles]);

  const fetchAndShowFileContent = async (fileName) => {
    setLoading(true);
    setFeedback(null);
    try {
      const response = await backendAPIClient.get("/s3/download", {
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
      console.error("Error fetching file content:", error);
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
        className={`nhsuk-pagination-btn${currentPage === i ? " active" : ""}`}
        aria-label={`Page ${i}`}
        aria-current={currentPage === i ? "page" : undefined}
      >
        {i}
      </button>,
    );
  }

  return (
    <div>
      <main className="container">
        <div className="two-column-content">
          <div className="history-table-column">
            <table>
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Date Uploaded</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && allFiles.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="text-center">
                      Loading files...
                    </td>
                  </tr>
                ) : currentFiles.length > 0 ? (
                  currentFiles.map((file, index) => (
                    <tr key={index}>
                      <td>{file.name.split("|~")[1] || ""}</td>
                      <td>{file.last_modified}</td>
                      <td>
                        <button
                          onClick={() => fetchAndShowFileContent(file.name)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center">
                      No assessment files found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {totalPages > 1 && (
              <nav className="nhsuk-pagination-nav" aria-label="Pagination">
                <button
                  className="nhsuk-pagination-btn"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  &lsaquo; Previous
                </button>
                {paginationButtons}
                <button
                  className="nhsuk-pagination-btn"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  Next &rsaquo;
                </button>
              </nav>
            )}
          </div>
          <AIFeedback feedback={feedback} isLoading={isLoading} />
        </div>
      </main>
    </div>
  );
}

export default History;
