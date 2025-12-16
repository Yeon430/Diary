import "./App.css";
import { useState, useEffect, useRef } from "react";
import FeelingPage from "./pages/FeelingPage";
import NotePage from "./pages/NotePage";
import UploadPage from "./pages/UploadPage";
import DetailPage from "./pages/DetailPage";
import ChatPage from "./pages/ChatPage";
import WordBubbles from "./components/WordBubbles";
import { getDiaryEntries } from "./utils/localStorage";

function App() {
  const [inputValue, setInputValue] = useState("");
  const [inputWidth, setInputWidth] = useState("100%");
  const [currentPage, setCurrentPage] = useState("input"); // 'input', 'feeling', 'note', 'upload', or 'detail'
  const [selectedWordIndex, setSelectedWordIndex] = useState(null); // 선택된 단어 박스의 인덱스
  const [isDrawing, setIsDrawing] = useState(false);
  const [noteValue, setNoteValue] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [drawnFaceImage, setDrawnFaceImage] = useState(null);
  const [savedInputValue, setSavedInputValue] = useState(""); // 메인 페이지에서 입력한 단어 저장
  const [showLayerMessage, setShowLayerMessage] = useState(false); // "One more layer added!" 메시지 표시
  const [bubbleLayout, setBubbleLayout] = useState([]); // 정적인 버블 위치/회전 정보
  const inputRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [words, setWords] = useState([
    { text: "LA", icon: true },
    { text: "PAris", icon: true },
    { text: "watermelon", icon: true },
    { text: "Pizzaa", icon: true },
    { text: "Movie", icon: true },
  ]);

  // localStorage에서 다이어리 항목 불러오기
  useEffect(() => {
    const entries = getDiaryEntries();
    if (entries.length > 0) {
      // localStorage 항목을 words 형식으로 변환
      const loadedWords = entries.map((entry) => ({
        text: entry.word || "",
        icon: !!entry.feeling, // feeling이 있으면 icon 표시
        faceImage: entry.feeling || null, // base64 이미지
        note: entry.note || "",
        uploadedFile: entry.media || null, // base64 문자열
        date: entry.date || "",
        id: entry.id, // 나중에 사용할 수 있도록 id 저장
        mediaType: entry.mediaType || null,
      }));

      // 기존 하드코딩된 words와 합치기 (중복 제거)
      setWords((prevWords) => {
        const existingTexts = new Set(prevWords.map((w) => w.text));
        const newWords = loadedWords.filter((w) => !existingTexts.has(w.text));
        return [...prevWords, ...newWords];
      });
    }
  }, []);

  // 버블 위치 하드코딩 (스크린샷 정확히 재현)
  useEffect(() => {
    const hardcodedLayout = [
      { leftPercent: 18, bottomPx: 250, rotationDeg: -10 },
      { leftPercent: 20, bottomPx: 160, rotationDeg: -20 },
      { leftPercent: 30, bottomPx: 50, rotationDeg: -40 },
      { leftPercent: 65, bottomPx: 220, rotationDeg: 10 },
      { leftPercent: 75, bottomPx: 60, rotationDeg: -20 },
    ];

    setBubbleLayout(hardcodedLayout);
  }, []);

  // Canvas 초기화
  useEffect(() => {
    if (currentPage === "feeling" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      // 캔버스 크기 설정 (고정 크기)
      const container = canvas.parentElement;
      if (container) {
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        // 그리기 스타일 설정
        ctx.strokeStyle = "#364C41";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  }, [currentPage]);

  if (currentPage === "feeling") {
    return (
      <FeelingPage
        canvasRef={canvasRef}
        isDrawing={isDrawing}
        setIsDrawing={setIsDrawing}
        setCurrentPage={setCurrentPage}
        setDrawnFaceImage={setDrawnFaceImage}
      />
    );
  }

  if (currentPage === "note") {
    return (
      <NotePage
        noteValue={noteValue}
        setNoteValue={setNoteValue}
        setCurrentPage={setCurrentPage}
      />
    );
  }

  if (currentPage === "upload") {
    return (
      <UploadPage
        fileInputRef={fileInputRef}
        uploadedFile={uploadedFile}
        setUploadedFile={setUploadedFile}
        savedInputValue={savedInputValue}
        drawnFaceImage={drawnFaceImage}
        noteValue={noteValue}
        setNoteValue={setNoteValue}
        setWords={setWords}
        setShowLayerMessage={setShowLayerMessage}
        setCurrentPage={setCurrentPage}
        setInputValue={setInputValue}
        setSavedInputValue={setSavedInputValue}
        setDrawnFaceImage={setDrawnFaceImage}
        canvasRef={canvasRef}
      />
    );
  }

  // Chat page
  if (currentPage === "chat") {
    return <ChatPage setCurrentPage={setCurrentPage} />;
  }

  // Detail page (diary entry view)
  if (currentPage === "detail" && selectedWordIndex !== null) {
    const selectedWord = words[selectedWordIndex];
    return (
      <DetailPage
        selectedWord={selectedWord}
        setCurrentPage={setCurrentPage}
        setSelectedWordIndex={setSelectedWordIndex}
      />
    );
  }

  return (
    <div className="App">
      <div className="main-container">
        {/* Header */}
        <div className="header">
          <div className="settings-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#364C41"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4m0 12v4M5.64 5.64l2.83 2.83m7.06 7.06l2.83 2.83M2 12h4m12 0h4M5.64 18.36l2.83-2.83m7.06-7.06l2.83-2.83" />
            </svg>
          </div>
        </div>

        {/* Chat bubble */}
        <div className="chat-section">
          <div className="chat-bubble">
            {showLayerMessage ? "Great job!" : "If you need some advise.."}
          </div>
          <div
            className="avatar"
            onClick={() => setCurrentPage("chat")}
            style={{ cursor: "pointer" }}
          ></div>
        </div>

        {/* Layer added message */}
        {showLayerMessage && (
          <div className="layer-message-section">
            <div className="layer-message-text">One more layer added!</div>
          </div>
        )}

        {/* Main question - showLayerMessage일 때는 숨김 */}
        {!showLayerMessage && (
          <div className="question-section">
            <div className="question-text">
              <span className="greeting">
                Hi <span className="highlight">Yonoo</span>!
              </span>
            </div>
            <div className="question-text">What's one</div>
            <div className="question-text">word for your</div>
            <div className="question-text">day today?</div>
          </div>
        )}

        {/* Input field - showLayerMessage일 때는 숨김 */}
        {!showLayerMessage && (
          <div className="input-section">
            <div className={`input-field ${inputValue ? "has-text" : ""}`}>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && inputValue.trim()) {
                    setSavedInputValue(inputValue); // 입력한 단어 저장
                    setCurrentPage("feeling");
                  }
                }}
                placeholder=""
                className="input-text"
              />
            </div>
            {inputValue && (
              <div
                className="submit-button"
                onClick={() => {
                  setSavedInputValue(inputValue); // 입력한 단어 저장
                  setCurrentPage("feeling");
                }}
              >
                <svg
                  className="submit-arrow"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M7 4L13 10L7 16"
                    stroke="#364C41"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}
          </div>
        )}

        {/* Word bubbles */}
        <WordBubbles
          words={words}
          bubbleLayout={bubbleLayout}
          currentPage={currentPage}
          setSelectedWordIndex={setSelectedWordIndex}
          setCurrentPage={setCurrentPage}
          setInputValue={setInputValue}
          inputRef={inputRef}
        />
      </div>
    </div>
  );
}

export default App;
