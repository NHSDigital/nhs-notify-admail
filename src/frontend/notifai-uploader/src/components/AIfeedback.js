import { useState, useEffect } from "react";
import "./AIfeedback.css";
import { SpinnerCircular } from 'spinners-react';

export default function AIFeedback({ feedback }) {
  // Determine the rating class based on the value
  const [feedbackObj, setFeedbackObj] = useState(Object);
  const [spinner, setSpinner] = useState(false);

  const getRatingClass = (rating) => {
    console.log(rating);
    try {
      const ratingString = rating.toString().toUpperCase();
    switch (ratingString) {
      case "BUSINESS":
        return "rating-business";
      case "UNSURE":
        return "rating-unsure";
      case "ADVERTISING":
        return "rating-advertising";
      default:
        return "rating-default"; // Fallback style if rating is unexpected
    } 
    } catch (error) {
      console.log('setting the rating colour: ', error);
    }
    
  };

  // Effect to handle the Promise resolution
  useEffect(() => {
    // If feedback is a Promise, resolve it
    if (feedback && typeof feedback.then === 'function') {
      setSpinner(true);
      feedback
        .then((resolvedData) => {
          console.log('Resolved feedback data:', resolvedData);
          setFeedbackObj(resolvedData); // Update state with resolved data
          setSpinner(false);
        })
        .catch((error) => {
          console.error('Error resolving feedback Promise:', error);
          setFeedbackObj(Object); // Set to null on error to show "No file uploaded yet"
          setSpinner(false);

        });
    } else {
      // If feedback is not a Promise (e.g., already resolved or null), use it directly
      console.log('Feedback is not a Promise, setting directly:', feedback);
      setFeedbackObj(feedback || Object);
      setSpinner(false);
    }
  }, [feedback]);

  const hasValidFeedback = feedbackObj && Object.keys(feedbackObj).length > 0 && feedbackObj.Description;


  return (
    
    <div className="ai-feedback">
      <div className="feedback-box">
        {hasValidFeedback ? (
          <div className="assessment-container">
            <h2>Assessment:</h2>
            <div className="assessment-content">
              <p>
                <strong>Description:</strong> {feedbackObj.Description}
              </p>
              <br />
              <p>
                <strong>Rating:</strong>{" "}
                <span className={getRatingClass(feedbackObj.Rating) || "rating-default"}> 
                  {feedbackObj.Rating}
                </span>
              </p>
              <br />
              <p>
                <strong>Reason:</strong> {feedbackObj.Reason}
              </p>
              <br />
              <p>
                <strong>Advice:</strong> {feedbackObj.Advice}
              </p>
            </div>
          </div>
        ) : (
          <p className="no-feedback">No file uploaded yet.</p>
        )}
        {typeof feedback.then === 'function' && spinner && (
          <div className="spinner-overlay">
            <SpinnerCircular
              size={64}
              thickness={100}
              speed={100}
              color="#005EB8"
              secondaryColor="#e5e7eb"
            />
          </div>
        )}
      </div>
    </div>
  );
}
