import React, { useState, useRef, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDiaryEntries } from "../utils/localStorage";

function ChatPage({ setCurrentPage, selectedDiaryEntry }) {
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
  const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
  const [diaryEntries, setDiaryEntries] = useState([]);
  const [selectedEntryId, setSelectedEntryId] = useState(null);

  // 초기 메시지 생성 - 선택된 일기가 있으면 그에 대한 내용 포함
  const getInitialMessage = () => {
    if (selectedDiaryEntry) {
      const diaryText = selectedDiaryEntry.note || "";
      const diaryWord = selectedDiaryEntry.text || "";
      const diaryDate = selectedDiaryEntry.date || "";

      if (diaryText || diaryWord) {
        return {
          id: 1,
          type: "ai",
          content: `Hi Yonoo!\nI see you're looking at your diary entry about "${diaryWord}"${
            diaryDate ? ` from ${diaryDate}` : ""
          }.\nWhat do you need today?`,
          suggestions: [
            "Clear advice",
            "Supportive messages",
            "Write apologies for me",
          ],
        };
      }
    }

    return {
      id: 1,
      type: "ai",
      content: "Hi Yonoo!\nWhat do you need today?",
      suggestions: [
        "Clear advice",
        "Supportive messages",
        "Write apologies for me",
      ],
    };
  };

  const [messages, setMessages] = useState([getInitialMessage()]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  // Load diary entries on mount
  useEffect(() => {
    const entries = getDiaryEntries();
    setDiaryEntries(entries);

    // 선택된 일기가 있으면 그것을 사용, 없으면 가장 최근 항목 선택
    if (selectedDiaryEntry) {
      // selectedDiaryEntry의 id와 일치하는 항목 찾기
      if (selectedDiaryEntry.id) {
        const matchingEntry = entries.find(
          (entry) => entry.id === selectedDiaryEntry.id
        );
        if (matchingEntry) {
          setSelectedEntryId(matchingEntry.id);
        }
      } else {
        // id가 없으면 word로 찾기
        const matchingByWord = entries.find(
          (entry) => entry.word === selectedDiaryEntry.text
        );
        if (matchingByWord) {
          setSelectedEntryId(matchingByWord.id);
        }
      }
    } else if (entries.length > 0) {
      // 선택된 일기가 없으면 가장 최근 항목 선택
      const sortedEntries = [...entries].sort((a, b) => {
        const dateA = a.date
          ? new Date(a.date.replace(/\./g, "-"))
          : new Date(0);
        const dateB = b.date
          ? new Date(b.date.replace(/\./g, "-"))
          : new Date(0);
        return dateB - dateA;
      });
      setSelectedEntryId(sortedEntries[0].id);
    }
  }, [selectedDiaryEntry]);

  const scrollToBottom = () => {
    // scrollIntoView 사용 (messagesEndRef)
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }

    // scrollTop 직접 설정 (백업)
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  };

  useEffect(() => {
    // 메시지가 변경될 때마다 스크롤
    setTimeout(() => scrollToBottom(), 100);
  }, [messages]);

  // 컴포넌트 마운트 시에도 스크롤
  useEffect(() => {
    setTimeout(() => scrollToBottom(), 100);
  }, []);

  // Get the selected diary entry
  const getSelectedEntry = () => {
    if (!selectedEntryId) return null;
    return diaryEntries.find((entry) => entry.id === selectedEntryId);
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    // 사용자 메시지 추가
    const userMessage = {
      id: Date.now(),
      type: "user",
      content: inputValue,
    };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue("");

    // 로딩 메시지 추가
    const loadingMessage = {
      id: Date.now() + 1,
      type: "ai",
      content: "Thinking...",
      isLoading: true,
    };
    setMessages((prev) => [...prev, loadingMessage]);

    try {
      if (!genAI) {
        throw new Error("API key not configured");
      }

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // Include diary context if available
      const selectedEntry = getSelectedEntry();
      let prompt = currentInput;

      if (selectedEntry && (selectedEntry.note || selectedEntry.word)) {
        const diaryContext = `Diary Entry:
Date: ${selectedEntry.date || ""}
Word: ${selectedEntry.word || ""}
Note: ${selectedEntry.note || ""}

User's question: ${currentInput}

IMPORTANT: Keep your response SHORT (2-3 sentences maximum). Do NOT use any markdown formatting like **, #, -, or bullet points. Write in plain text only, as if you're having a casual conversation. Respond to the user's question, considering the context from their diary entry.`;
        prompt = diaryContext;
      } else {
        // Add instructions even when no diary entry
        prompt = `${currentInput}

IMPORTANT: Keep your response SHORT (2-3 sentences maximum). Do NOT use any markdown formatting like **, #, -, or bullet points. Write in plain text only.`;
      }

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // 로딩 메시지 제거하고 응답 추가
      setMessages((prev) => {
        const filtered = prev.filter((msg) => !msg.isLoading);
        return [
          ...filtered,
          {
            id: Date.now() + 2,
            type: "ai",
            content: text,
            suggestions: [
              "Clear advice",
              "Supportive messages",
              "Write apologies for me",
            ],
          },
        ];
      });
      // 스크롤을 맨 아래로
      setTimeout(() => scrollToBottom(), 200);
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      // 에러 메시지 표시
      setMessages((prev) => {
        const filtered = prev.filter((msg) => !msg.isLoading);
        return [
          ...filtered,
          {
            id: Date.now() + 2,
            type: "ai",
            content:
              "Sorry, I'm having trouble connecting. Please check your API key.",
            suggestions: [
              "Clear advice",
              "Supportive messages",
              "Write apologies for me",
            ],
          },
        ];
      });
      // 스크롤을 맨 아래로
      setTimeout(() => scrollToBottom(), 200);
    }
  };

  // Create prompt based on button type and diary entry
  const createPrompt = (buttonType, diaryEntry) => {
    const diaryText = diaryEntry?.note || "";
    const diaryWord = diaryEntry?.word || "";
    const diaryDate = diaryEntry?.date || "";

    const hasDiaryContent = diaryText || diaryWord;
    const context = hasDiaryContent
      ? `Diary Entry:
Date: ${diaryDate}
Word: ${diaryWord}
Note: ${diaryText}`
      : "";

    const baseInstructions = `IMPORTANT: Keep your response SHORT (2-3 sentences maximum). Do NOT use any markdown formatting like **, #, -, or bullet points. Write in plain text only, as if you're having a casual conversation.`;

    switch (buttonType) {
      case "Clear advice":
        return hasDiaryContent
          ? `${context}

${baseInstructions}
Based on this diary entry, provide clear, practical advice in 2-3 short sentences. Be direct and helpful.`
          : `${baseInstructions}
The user is asking for clear, practical advice. Provide helpful guidance in 2-3 short sentences.`;

      case "Supportive messages":
        return hasDiaryContent
          ? `${context}

${baseInstructions}
Based on this diary entry, provide warm, empathetic, and supportive messages in 2-3 short sentences. Be understanding and encouraging.`
          : `${baseInstructions}
The user is looking for support and encouragement. Provide warm, empathetic messages in 2-3 short sentences.`;

      case "Write apologies for me":
        return hasDiaryContent
          ? `${context}

${baseInstructions}
Based on this diary entry, write a sincere and thoughtful apology message. Keep it short (2-3 sentences) and genuine.`
          : `${baseInstructions}
The user needs help writing an apology message. Write a short, sincere apology (2-3 sentences) or ask what situation they need to apologize for.`;

      default:
        return context || "How can I help you today?";
    }
  };

  // Handle button click - trigger API call with specific prompt type
  const handleSuggestionClick = async (suggestion) => {
    const selectedEntry = getSelectedEntry();

    // Add user message showing which button was clicked
    const userMessage = {
      id: Date.now(),
      type: "user",
      content: suggestion,
    };
    setMessages((prev) => [...prev, userMessage]);

    // Add loading message
    const loadingMessage = {
      id: Date.now() + 1,
      type: "ai",
      content: "Thinking...",
      isLoading: true,
    };
    setMessages((prev) => [...prev, loadingMessage]);

    try {
      if (!genAI) {
        throw new Error("API key not configured");
      }

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = createPrompt(suggestion, selectedEntry);

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Remove loading message and add response
      setMessages((prev) => {
        const filtered = prev.filter((msg) => !msg.isLoading);
        return [
          ...filtered,
          {
            id: Date.now() + 2,
            type: "ai",
            content: text,
            suggestions: [
              "Clear advice",
              "Supportive messages",
              "Write apologies for me",
            ],
          },
        ];
      });
      // 스크롤을 맨 아래로
      setTimeout(() => scrollToBottom(), 200);
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      // Error message
      setMessages((prev) => {
        const filtered = prev.filter((msg) => !msg.isLoading);
        return [
          ...filtered,
          {
            id: Date.now() + 2,
            type: "ai",
            content:
              "Sorry, I'm having trouble connecting. Please check your API key.",
            suggestions: [
              "Clear advice",
              "Supportive messages",
              "Write apologies for me",
            ],
          },
        ];
      });
      // 스크롤을 맨 아래로
      setTimeout(() => scrollToBottom(), 200);
    }
  };

  // Get selected entry info for display
  const selectedEntry = getSelectedEntry();

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

        {/* Diary entry selector */}
        {diaryEntries.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              zIndex: 1000,
              background: "rgba(255, 255, 255, 0.1)",
              padding: "8px 12px",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#ffffff",
            }}
          >
            {selectedEntry ? (
              <div>
                <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                  Reading: {selectedEntry.word || "Untitled"}
                </div>
                {selectedEntry.date && (
                  <div style={{ opacity: 0.8, fontSize: "11px" }}>
                    {selectedEntry.date}
                  </div>
                )}
              </div>
            ) : (
              <div>No entry selected</div>
            )}
          </div>
        )}

        {/* Chat messages */}
        <div className="chat-messages" ref={messagesContainerRef}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`chat-message ${
                message.type === "ai" ? "ai-message" : "user-message"
              }`}
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
          <div
            ref={messagesEndRef}
            style={{
              height: "1px",
              width: "100%",
              flexShrink: 0,
            }}
          />
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
