import React, { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

function NewsAnalyzer() {
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const API_BASE = "http://localhost:8080/api/news";

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API_BASE}/history`, {
        params: { userId }
      });
      setHistory(response.data);
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchHistory();
    }
  }, [userId]);

  const analyzeNews = async () => {
    if (!title.trim() || !content.trim()) {
      alert("Please enter both title and content.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(`${API_BASE}/analyze`, {
        userId,
        title,
        content,
      });

      setResult(response.data);
      setTitle("");
      setContent("");
      fetchHistory();
    } catch (error) {
      console.error("Error analyzing text news:", error);
      alert("Failed to analyze news text.");
    } finally {
      setLoading(false);
    }
  };

  const analyzeUrl = async () => {
    if (!url.trim()) {
      alert("Please enter a valid URL.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(`${API_BASE}/analyze-url`, {
        userId,
        url,
      });

      setResult(response.data);
      setUrl("");
      fetchHistory();
    } catch (error) {
      console.error("Error analyzing URL:", error);

      if (error.response?.data?.detail) {
        alert(error.response.data.detail);
      } else {
        alert("Failed to analyze URL.");
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteHistory = async (id) => {
    try {
      await axios.delete(`${API_BASE}/${id}`);

      if (result && result.id === id) {
        setResult(null);
      }

      fetchHistory();
    } catch (error) {
      console.error("Error deleting history:", error);
      alert("Failed to delete history item.");
    }
  };

  const downloadPdf = () => {
    if (!result) {
      alert("No result available to download.");
      return;
    }

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("AI Fake News Analysis Report", 20, 20);

    doc.setFontSize(12);
    doc.text(`Title: ${result.title || "N/A"}`, 20, 40);
    doc.text(`Prediction: ${result.prediction || "N/A"}`, 20, 50);
    doc.text(
      `Confidence: ${
        result.confidence ? (result.confidence * 100).toFixed(2) + "%" : "N/A"
      }`,
      20,
      60
    );

    if (result.sourceType) {
      doc.text(`Source Type: ${result.sourceType}`, 20, 70);
    }

    let y = 85;

    if (result.important_words && result.important_words.length > 0) {
      const wordsText = `Important Words: ${result.important_words.join(", ")}`;
      const splitWords = doc.splitTextToSize(wordsText, 170);
      doc.text(splitWords, 20, y);
      y += splitWords.length * 7 + 5;
    }

    const contentText = result.content
      ? result.content.substring(0, 800)
      : "No content available.";

    const splitText = doc.splitTextToSize(`Content Preview: ${contentText}`, 170);
    doc.text(splitText, 20, y);

    doc.save("fake-news-analysis-report.pdf");
  };

  const realCount = history.filter((h) => h.prediction === "REAL").length;
  const fakeCount = history.filter((h) => h.prediction === "FAKE").length;

  const chartData = {
    labels: ["Real News", "Fake News"],
    datasets: [
      {
        data: [realCount, fakeCount],
        backgroundColor: ["green", "red"],
        borderWidth: 1,
      },
    ],
  };

  const renderConfidenceBar = (confidence, prediction) => (
    <div
      style={{
        width: "100%",
        background: "#ddd",
        borderRadius: "6px",
        marginTop: "8px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.min(confidence * 100, 100)}%`,
          background: prediction === "REAL" ? "green" : "red",
          height: "10px",
          borderRadius: "6px",
        }}
      ></div>
    </div>
  );

  const cardStyle = {
    background: "white",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    marginBottom: "24px",
  };

  const inputStyle = {
    width: "100%",
    padding: "12px",
    marginBottom: "12px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    boxSizing: "border-box",
  };

  const badgeStyle = {
    display: "inline-block",
    background: "#e5e7eb",
    padding: "6px 10px",
    borderRadius: "6px",
    marginRight: "6px",
    marginBottom: "6px",
  };

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div style={cardStyle}>
          <h3>Total Analyses</h3>
          <p style={{ fontSize: "24px", fontWeight: "bold" }}>{history.length}</p>
        </div>

        <div style={cardStyle}>
          <h3>Real News Count</h3>
          <p style={{ fontSize: "24px", fontWeight: "bold", color: "green" }}>
            {realCount}
          </p>
        </div>

        <div style={cardStyle}>
          <h3>Fake News Count</h3>
          <p style={{ fontSize: "24px", fontWeight: "bold", color: "red" }}>
            {fakeCount}
          </p>
        </div>
      </div>

      <div style={cardStyle}>
        <h2>Detection Analytics</h2>
        <div style={{ width: "300px", margin: "auto" }}>
          <Pie data={chartData} />
        </div>
      </div>

      <div style={cardStyle}>
        <h2>Analyze News by Text</h2>

        <input
          type="text"
          placeholder="Enter news title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={inputStyle}
        />

        <textarea
          placeholder="Enter news content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          style={{
            ...inputStyle,
            height: "140px",
            resize: "vertical",
          }}
        />

        <button
          onClick={analyzeNews}
          disabled={loading}
          style={{
            padding: "12px 20px",
            border: "none",
            borderRadius: "8px",
            background: "#111827",
            color: "white",
            cursor: "pointer",
          }}
        >
          {loading ? "Analyzing news with AI..." : "Analyze Text"}
        </button>
      </div>

      <div style={cardStyle}>
        <h2>Analyze News by URL</h2>

        <input
          type="text"
          placeholder="Paste article URL here"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={inputStyle}
        />

        <button
          onClick={analyzeUrl}
          disabled={loading}
          style={{
            padding: "12px 20px",
            border: "none",
            borderRadius: "8px",
            background: "#2563eb",
            color: "white",
            cursor: "pointer",
          }}
        >
          {loading ? "Extracting and analyzing..." : "Analyze URL"}
        </button>
      </div>

      {result && (
        <div style={cardStyle}>
          <h2>Latest Result</h2>

          <p>
            <strong>Title:</strong> {result.title}
          </p>

          <p>
            <strong>Prediction:</strong>{" "}
            <span
              style={{
                color: result.prediction === "REAL" ? "green" : "red",
                fontWeight: "bold",
              }}
            >
              {result.prediction}
            </span>
          </p>

          <p>
            <strong>Confidence:</strong> {(result.confidence * 100).toFixed(2)}%
          </p>

          {renderConfidenceBar(result.confidence, result.prediction)}

          {result.sourceType && (
            <p style={{ marginTop: "12px" }}>
              <strong>Source Type:</strong> {result.sourceType}
            </p>
          )}

          {result.content && (
            <p style={{ marginTop: "12px" }}>
              <strong>Content Preview:</strong>{" "}
              {result.content.length > 300
                ? result.content.substring(0, 300) + "..."
                : result.content}
            </p>
          )}

          {result.important_words && result.important_words.length > 0 && (
            <div style={{ marginTop: "20px" }}>
              <h3>Important Words Detected</h3>

              {result.important_words.map((word, index) => (
                <span key={index} style={badgeStyle}>
                  {word}
                </span>
              ))}
            </div>
          )}

          <p style={{ color: "#6b7280", marginTop: "14px" }}>
            This prediction is based on learned text patterns and may not always reflect real-world factual truth.
          </p>

          <button
            onClick={downloadPdf}
            style={{
              marginTop: "14px",
              padding: "10px 16px",
              border: "none",
              borderRadius: "8px",
              background: "#059669",
              color: "white",
              cursor: "pointer",
            }}
          >
            Download PDF Report
          </button>
        </div>
      )}

      <div style={cardStyle}>
        <h2>Your History</h2>

        {history.length === 0 ? (
          <p>No history found.</p>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                padding: "14px",
                marginBottom: "12px",
                background: "#fafafa",
              }}
            >
              <p>
                <strong>Title:</strong> {item.title}
              </p>

              <p>
                <strong>Prediction:</strong>{" "}
                <span
                  style={{
                    color: item.prediction === "REAL" ? "green" : "red",
                    fontWeight: "bold",
                  }}
                >
                  {item.prediction}
                </span>
              </p>

              <p>
                <strong>Confidence:</strong> {(item.confidence * 100).toFixed(2)}%
              </p>

              {renderConfidenceBar(item.confidence, item.prediction)}

              {item.sourceType && (
                <p style={{ marginTop: "10px" }}>
                  <strong>Source Type:</strong> {item.sourceType}
                </p>
              )}

              <p style={{ marginTop: "10px" }}>
                <strong>Content:</strong> {item.content}
              </p>

              {item.important_words && item.important_words.length > 0 && (
                <div style={{ marginTop: "12px" }}>
                  <strong>Important Words:</strong>
                  <div style={{ marginTop: "8px" }}>
                    {item.important_words.map((word, index) => (
                      <span key={index} style={badgeStyle}>
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => deleteHistory(item.id)}
                style={{
                  marginTop: "12px",
                  padding: "8px 14px",
                  border: "none",
                  borderRadius: "8px",
                  background: "#dc2626",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default NewsAnalyzer;