import React from "react";

function DetailPage({ selectedWord, setCurrentPage, setSelectedWordIndex, setSelectedWordForChat }) {
  if (!selectedWord) return null;

  return (
    <div className="App">
      <div className="main-container detail-container">
        {/* Back button */}
        <button
          className="back-button"
          onClick={() => {
            setCurrentPage("input");
            setSelectedWordIndex(null);
          }}
          style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            zIndex: 100,
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Header with word bubble and face */}
        <div className="detail-header">
          <div className="detail-word-bubble">{selectedWord.text}</div>
          {selectedWord.faceImage && (
            <div className="detail-face-circle">
              <img
                src={selectedWord.faceImage}
                alt="Face"
                className="detail-face-image"
              />
            </div>
          )}
        </div>

        {/* Note text */}
        {selectedWord.note && (
          <div className="detail-note-text">{selectedWord.note}</div>
        )}

        {/* Uploaded image/video */}
        {selectedWord.uploadedFile && (
          <div className="detail-image-container">
            {(() => {
              // base64 문자열인지 File 객체인지 확인
              const isBase64 = typeof selectedWord.uploadedFile === "string";
              const mediaType = isBase64
                ? selectedWord.mediaType
                : selectedWord.uploadedFile.type;
              const src = isBase64
                ? selectedWord.uploadedFile
                : URL.createObjectURL(selectedWord.uploadedFile);

              return mediaType && mediaType.startsWith("image/") ? (
                <img src={src} alt="Uploaded" className="detail-image" />
              ) : (
                <video src={src} controls className="detail-image" />
              );
            })()}
          </div>
        )}

        {/* Footer with avatar, chat bubble, and date */}
        <div className="detail-footer">
          <div className="avatar detail-avatar"></div>
          <div 
            className="detail-chat-bubble"
            onClick={() => {
              if (setSelectedWordForChat) {
                setSelectedWordForChat(selectedWord);
              }
              setCurrentPage("chat");
            }}
            style={{ cursor: "pointer" }}
          >
            If you need some help..
          </div>
          {selectedWord.date && (
            <div className="detail-date">{selectedWord.date}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DetailPage;
