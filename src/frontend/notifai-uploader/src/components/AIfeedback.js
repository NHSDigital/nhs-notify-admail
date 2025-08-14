import { useState, useEffect } from "react";
import "./AIfeedback.css";
import { SpinnerCircular } from "spinners-react";
import ReactMarkdown from "react-markdown";

export default function AIFeedback({ feedback, isLoading }) {
  const [feedbackObj, setFeedbackObj] = useState(null);

  const getRatingClass = (rating) => {
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
          return "rating-default";
      }
    } catch (error) {
      console.log("setting the rating colour: ", error);
    }
  };

  const processObject = (obj) => {
    Object.keys(obj).forEach((key) => {
      if (typeof obj[key] === "string") {
        obj[key] = obj[key]
          .replace(/\\n/g, "\n")
          .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, "-")
          .replace(/\n[-*]\s*/g, "\n- ")
          .replace(/```|`|<|>|\|/g, "");
      }
    });
    return obj;
  };


  // This may be redundant
  useEffect(() => {
    if (feedback && typeof feedback.then === "function") {
      setFeedbackObj(null);
      feedback
        .then((resolvedData) => {
            setFeedbackObj(resolvedData);
        })
        .catch((error) => {
          setFeedbackObj(null);
        });
    } else {
      setFeedbackObj(feedback);
    }
  }, [feedback]);

  const returnContent = () => {
    if (isLoading) {
      return (<div className="spinner-overlay">
      <SpinnerCircular
        size={64}
        thickness={100}
        speed={100}
        color="#005EB8"
        secondaryColor="#e5e7eb"
      />
    </div>)
    } else {
      if (typeof feedbackObj === 'string' && feedbackObj.includes("not an acceptable input prompt and has been rejected.")) {
        return (<p className="no-feedback">AI Guardrails have rejected this letter, please edit and resubmit</p>)
      } else if (feedbackObj === null) {
        return (<p className="no-feedback">No file uploaded yet.</p>)
      } else if(feedbackObj === undefined){
        return (<p className="no-feedback">Undefined response</p>)
      }
      else if (typeof feedbackObj === 'object' && Object.keys(feedbackObj).length > 0) {
        const cleanedFeedback = processObject(feedbackObj);
        return (
          <div className="assessment-container">
            <h2>Assessment:</h2>
            <div className="assessment-content">
              <strong style={{ fontSize: "19px" }}>Description: </strong>
              <br />
              <span style={{ fontSize: "19px" }}>
                {cleanedFeedback.description || ""}
              </span>
              <br />
              <br />
              <strong style={{ fontSize: "19px" }}>Rating:</strong>{" "}
              <span
                className={
                  getRatingClass(cleanedFeedback.rating) || "rating-default"
                }
              >
                {cleanedFeedback.rating}
              </span>
              <br />
              <br />
              <strong style={{ fontSize: "19px" }}>Reason:</strong>
              <ReactMarkdown>{cleanedFeedback.reason || ""}</ReactMarkdown>
              <br />
              <strong style={{ fontSize: "19px" }}>Advice:</strong>
              <ReactMarkdown>{cleanedFeedback.advice || ""}</ReactMarkdown>
            </div>
          </div>
        )
      } else {
        return (<p className="no-feedback">No file uploaded yet.</p>)
      }
    }
  }

  return (
    <div className="ai-feedback">
      <div className="feedback-box">
        {returnContent()}
      </div>
    </div>
  );
}
