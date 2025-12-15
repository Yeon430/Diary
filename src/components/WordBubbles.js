import React from "react";

function WordBubbles({
  words,
  currentPage,
  setSelectedWordIndex,
  setCurrentPage,
  setInputValue,
  inputRef,
  bubbleLayout,
}) {
  return (
    <div className="word-bubbles">
      {words.map((word, i) => {
        const layout = bubbleLayout?.[i];
        if (!layout) return null;

        return (
          <div
            key={i}
            className={`word-bubble ${word.isCircle ? "circle-only" : ""}`}
            style={{
              left: `${layout.leftPercent}%`,
              bottom: `${layout.bottomPx}px`,
              transform: `translateX(-50%) rotate(${layout.rotationDeg}deg)`,
              zIndex: i,
              cursor:
                currentPage === "input" && !word.note && !word.uploadedFile
                  ? "text"
                  : "pointer",
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();

              // 메인 입력 페이지에서만 동작
              if (currentPage !== "input") return;

              if (word.note || word.uploadedFile) {
                // 메모나 업로드 파일이 있는 버블은 기존처럼 디테일 페이지로 이동
                setSelectedWordIndex(i);
                setCurrentPage("detail");
              } else {
                // 메모/파일이 없는 버블은 단어를 입력창에 넣고 포커스만 이동
                setInputValue(word.text);

                // 다음 프레임에 포커스 (렌더 타이밍 안정화)
                requestAnimationFrame(() => {
                  inputRef.current?.focus();
                });
              }
            }}
          >
            {word.text}
            {word.icon && (
              <span className="circle-icon">
                {word.faceImage && (
                  <img src={word.faceImage} alt="Face" className="face-image" />
                )}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default WordBubbles;
