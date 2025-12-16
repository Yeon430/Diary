import React, { useState, useRef, useEffect } from "react";

function ChatPage({ setCurrentPage }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "ai",
      content: "Hi Yonoo!\nWhat do you need today?",
      suggestions: ["Clear advice", "Supportive messages", "Write apologies for me"],
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    // 사용자 메시지 추가
    const userMessage = {
      id: Date.now(),
      type: "user",
      content: inputValue,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    // TODO: Gemini API 호출
    // 여기에 Gemini API 연동 코드 추가 예정
    setTimeout(() => {
      const aiMessage = {
        id: Date.now() + 1,
        type: "ai",
        content: "I'm here to help! (Gemini API will be connected here)",
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 500);
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div className="App">
      <div className="main-container chat-container">
        {/* Back button */}
        <button
          className="back-button"
          onClick={() => setCurrentPage("input")}
          style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            zIndex: 1000,
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Chat messages */}
        <div className="chat-messages">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`chat-message ${message.type === "ai" ? "ai-message" : "user-message"}`}
            >
              {message.type === "ai" && (
                <div className="chat-avatar">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="avatar-face"
                  >
                    <circle cx="12" cy="12" r="10" fill="#ffffff" />
                    <circle cx="9" cy="10" r="1.5" fill="#364c41" />
                    <circle cx="15" cy="10" r="1.5" fill="#364c41" />
                    <line
                      x1="9"
                      y1="14"
                      x2="15"
                      y2="14"
                      stroke="#364c41"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              )}
              <div className="message-content">
                <div className="message-bubble">
                  {message.content.split("\n").map((line, index) => (
                    <div key={index}>{line}</div>
                  ))}
                  {message.suggestions && (
                    <div className="suggestions">
                      {message.suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          className="suggestion-button"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input section */}
        <div className="chat-input-section">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && inputValue.trim()) {
                handleSend();
              }
            }}
            placeholder="Type a message..."
            className="chat-input"
          />
          <button
            className="send-button"
            onClick={handleSend}
            disabled={!inputValue.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;

