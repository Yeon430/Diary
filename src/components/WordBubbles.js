import React, { useEffect, useRef } from "react";
import Matter from "matter-js";

const {
  Engine,
  Render,
  Runner,
  Bodies,
  Body,
  Composite,
  Mouse,
  MouseConstraint,
  Events,
} = Matter;

function WordBubbles({
  words,
  currentPage,
  setSelectedWordIndex,
  setCurrentPage,
  setInputValue,
  inputRef,
  bubbleLayout,
}) {
  const containerRef = useRef(null);
  const engineRef = useRef(null);
  const renderRef = useRef(null);
  const runnerRef = useRef(null);
  const bubblesRef = useRef([]);
  const canvasRef = useRef(null);

  // input 페이지에서만 물리 엔진 활성화
  const isPhysicsEnabled = currentPage === "input";

  useEffect(() => {
    if (!isPhysicsEnabled || !containerRef.current || words.length === 0) {
      return;
    }

    let animationFrameId = null;
    const container = containerRef.current;
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    if (containerWidth === 0 || containerHeight === 0) return;

    // Matter.js 엔진 생성
    const engine = Engine.create();
    engine.world.gravity.y = 0.6; // 중력
    engineRef.current = engine;

    // 텍스트 크기 측정을 위한 임시 요소
    const textMeasure = document.createElement("div");
    textMeasure.style.position = "absolute";
    textMeasure.style.visibility = "hidden";
    textMeasure.style.height = "auto";
    textMeasure.style.width = "auto";
    textMeasure.style.whiteSpace = "nowrap";
    textMeasure.style.font = "20px ClashDisplay, Arial";
    textMeasure.style.padding = "0";
    document.body.appendChild(textMeasure);

    function getTextWidth(text, font) {
      textMeasure.style.font = font;
      textMeasure.textContent = text;
      return textMeasure.clientWidth;
    }

    function getTextHeight(font) {
      textMeasure.style.font = font;
      textMeasure.textContent = "Mg";
      return textMeasure.clientHeight;
    }

    // Canvas 생성 (고해상도 지원)
    const dpr = window.devicePixelRatio || 1;
    const canvas = document.createElement("canvas");
    canvas.width = containerWidth * dpr;
    canvas.height = containerHeight * dpr;
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "50";
    container.appendChild(canvas);
    canvasRef.current = canvas;

    const context = canvas.getContext("2d");
    
    // 고해상도 스케일링
    context.scale(dpr, dpr);
    
    // 선명한 렌더링을 위한 설정
    context.imageSmoothingEnabled = false;

    // Render 생성 (마우스 이벤트용으로만 사용)
    const render = Render.create({
      canvas: canvas,
      engine: engine,
      options: {
        width: containerWidth,
        height: containerHeight,
        wireframes: false,
        background: "transparent",
        showAngleIndicator: false,
        showVelocity: false,
        enabled: false, // 기본 렌더링 비활성화 (커스텀 렌더링 사용)
      },
    });
    renderRef.current = render;

    const font = "30px ClashDisplay, Arial";
    const paddingX = 28; // 가로 패딩 (좌우)
    const paddingY = 10; // 세로 패딩 (상하)
    const bubbles = [];

    // 버블 생성 (오래된 것부터)
    words.forEach((word, i) => {
      const text = word.text;
      const textWidth = getTextWidth(text, font);
      const textHeight = getTextHeight(font);
      const iconSize = word.icon && word.faceImage ? 24 : 0; // 아이콘 크기
      const iconPadding = word.icon && word.faceImage ? 8 : 0; // 아이콘과 텍스트 사이 간격
      const width = textWidth + paddingX * 2 + (iconSize > 0 ? iconSize + iconPadding : 0);
      const height = Math.max(textHeight, iconSize) + paddingY * 2;

      // 초기 위치: 오래된 항목일수록 더 위에서 시작
      const baseY = -100;
      const offsetY = i * 100; // 오래된 항목일수록 더 위
      const x = Math.random() * (containerWidth - width) + width / 2;
      const y = baseY - offsetY + Math.random() * 200;

      // 랜덤 회전 각도
      const rotation = (Math.random() - 0.5) * 0.2; // -0.1 ~ 0.1 라디안

      const bubble = Bodies.rectangle(x, y, width, height, {
        chamfer: { radius: Math.min(width, height) / 2 }, // pill 형태
        restitution: 0.6, // 튀는 효과
        friction: 0.01,
        frictionAir: 0.02,
        render: {
          fillStyle: "#3f4f45",
          strokeStyle: "#364c41",
          lineWidth: 0,
        },
        label: text,
        textWidth: textWidth,
        textHeight: textHeight,
        fixedWidth: width, // 고정된 너비 저장
        fixedHeight: height, // 고정된 높이 저장
        wordIndex: i, // 원본 인덱스 저장
        wordData: word, // 원본 데이터 저장
        rotation: rotation,
      });

      Body.setAngle(bubble, rotation);
      bubbles.push(bubble);
      Composite.add(engine.world, bubble);
    });

    bubblesRef.current = bubbles;

    // 벽 생성
    const wallOptions = {
      isStatic: true,
      render: { visible: false },
    };

    Composite.add(engine.world, [
      Bodies.rectangle(
        containerWidth / 2,
        containerHeight + 40,
        containerWidth,
        100,
        wallOptions
      ), // 바닥
      Bodies.rectangle(
        -50,
        containerHeight / 2,
        100,
        containerHeight,
        wallOptions
      ), // 왼쪽 벽
      Bodies.rectangle(
        containerWidth + 50,
        containerHeight / 2,
        100,
        containerHeight,
        wallOptions
      ), // 오른쪽 벽
    ]);

    // 마우스 제약 조건
    const mouse = Mouse.create(canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: { visible: false },
      },
    });

    Composite.add(engine.world, mouseConstraint);
    render.mouse = mouse;

    // 마우스 커서 변경
    canvas.style.pointerEvents = "auto";
    canvas.style.cursor = "grab";

    // 이미지 캐시
    const imageCache = new Map();
    bubbles.forEach((bubble) => {
      if (bubble.wordData.icon && bubble.wordData.faceImage) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          imageCache.set(bubble.wordIndex, img);
        };
        img.src = bubble.wordData.faceImage;
      }
    });

    // 클릭 이벤트 처리 (Matter.js의 마우스 제약 조건 사용)
    let clickStartTime = 0;
    let clickedBody = null;

    Events.on(mouseConstraint, "startdrag", (event) => {
      clickedBody = event.body;
      clickStartTime = Date.now();
      canvas.style.cursor = "grabbing";
    });

    Events.on(mouseConstraint, "enddrag", (event) => {
      const dragDuration = Date.now() - clickStartTime;
      const body = clickedBody;

      // 짧은 클릭/드래그만 클릭으로 간주 (300ms 이하)
      if (body && body.wordData && dragDuration < 300) {
        const wordData = body.wordData;
        const wordIndex = body.wordIndex;

        if (wordData.note || wordData.uploadedFile) {
          setSelectedWordIndex(wordIndex);
          setCurrentPage("detail");
        } else {
          setInputValue(wordData.text);
          requestAnimationFrame(() => {
            inputRef.current?.focus();
          });
        }
      }

      clickedBody = null;
      canvas.style.cursor = "grab";
    });

    // 클릭 이벤트 처리 (Matter.js의 마우스 제약 조건 사용)
    Events.on(mouseConstraint, "startdrag", (event) => {
      const body = event.body;
      if (body && body.wordData) {
        // 드래그 시작 시 커서 변경
        canvas.style.cursor = "grabbing";
      }
    });

    Events.on(mouseConstraint, "enddrag", (event) => {
      const body = event.body;
      if (body && body.wordData) {
        const wordData = body.wordData;
        const wordIndex = body.wordIndex;

        // 클릭 처리 (짧은 드래그는 클릭으로 간주)
        if (wordData.note || wordData.uploadedFile) {
          setSelectedWordIndex(wordIndex);
          setCurrentPage("detail");
        } else {
          setInputValue(wordData.text);
          requestAnimationFrame(() => {
            inputRef.current?.focus();
          });
        }
      }
      canvas.style.cursor = "grab";
    });

    // 커스텀 렌더링 루프
    const renderLoop = () => {
      context.clearRect(0, 0, containerWidth, containerHeight);

      bubbles.forEach((bubble) => {
        const word = bubble.label;
        const pos = bubble.position;
        const angle = bubble.angle;
        const wordData = bubble.wordData;

        // 버블 배경 그리기
        context.save();
        context.translate(pos.x, pos.y);
        context.rotate(angle);

        // pill 형태 배경 (고정된 크기 사용)
        const width = bubble.fixedWidth || (bubble.bounds.max.x - bubble.bounds.min.x);
        const height = bubble.fixedHeight || (bubble.bounds.max.y - bubble.bounds.min.y);
        const radius = Math.min(width, height) / 2;

        // 버블 배경 (dark green)
        context.fillStyle = "#364c41";
        context.beginPath();
        // roundRect 대신 수동으로 둥근 사각형 그리기
        const x = -width / 2;
        const y = -height / 2;
        context.moveTo(x + radius, y);
        context.lineTo(x + width - radius, y);
        context.quadraticCurveTo(x + width, y, x + width, y + radius);
        context.lineTo(x + width, y + height - radius);
        context.quadraticCurveTo(
          x + width,
          y + height,
          x + width - radius,
          y + height
        );
        context.lineTo(x + radius, y + height);
        context.quadraticCurveTo(x, y + height, x, y + height - radius);
        context.lineTo(x, y + radius);
        context.quadraticCurveTo(x, y, x + radius, y);
        context.closePath();
        context.fill();

        // 텍스트와 아이콘을 가로로 배치
        const textX = -width / 2 + paddingX; // 왼쪽에서 패딩만큼 떨어진 위치
        const iconX = width / 2 - paddingX - 12; // 오른쪽에서 패딩 + 반지름만큼 떨어진 위치
        
        // 텍스트 그리기 (왼쪽 정렬)
        context.font = font;
        context.textAlign = "left";
        context.textBaseline = "middle";
        
        // 텍스트 선명도를 위한 subtle stroke 추가
        context.strokeStyle = "#2a3a33";
        context.lineWidth = 1;
        context.lineJoin = "round";
        context.miterLimit = 2;
        
        // 텍스트 stroke (외곽선) 먼저 그리기
        context.strokeText(word, textX, 0);
        
        // 텍스트 fill (흰색)
        context.fillStyle = "#ffffff";
        context.fillText(word, textX, 0);

        // 얼굴 이미지 그리기 (오른쪽, 흰색 원 안에)
        if (wordData.icon && wordData.faceImage) {
          const cachedImg = imageCache.get(bubble.wordIndex);
          if (cachedImg) {
            context.save();
            context.translate(iconX, 0); // 오른쪽으로 이동
            
            // 흰색 원 배경
            context.beginPath();
            context.arc(0, 0, 12, 0, Math.PI * 2);
            context.fillStyle = "#ffffff";
            context.fill();
            
            // 이미지 클리핑
            context.beginPath();
            context.arc(0, 0, 12, 0, Math.PI * 2);
            context.clip();
            context.drawImage(cachedImg, -12, -12, 24, 24);
            context.restore();
          }
        }

        context.restore();
      });

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    // 렌더링 루프 시작
    renderLoop();
    
    // Runner 시작
    const runner = Runner.create();
    Runner.run(runner, engine);
    runnerRef.current = runner;

    // 주기적으로 랜덤 힘 적용 (통통 튀는 효과)
    const forceInterval = setInterval(() => {
      bubbles.forEach((bubble) => {
        if (Math.random() > 0.7) {
          const force = 0.01 * bubble.mass;
          Body.applyForce(bubble, bubble.position, {
            x: (Math.random() - 0.5) * force,
            y: (Math.random() - 0.5) * force,
          });
        }
      });
    }, 3000);

    // 리사이즈 핸들러
    const handleResize = () => {
      const newWidth = container.offsetWidth;
      const newHeight = container.offsetHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = newWidth * dpr;
      canvas.height = newHeight * dpr;
      canvas.style.width = `${newWidth}px`;
      canvas.style.height = `${newHeight}px`;
      context.scale(dpr, dpr);
      render.options.width = newWidth;
      render.options.height = newHeight;
    };

    window.addEventListener("resize", handleResize);

    // cleanup
    return () => {
      clearInterval(forceInterval);
      window.removeEventListener("resize", handleResize);
      document.body.removeChild(textMeasure);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (runnerRef.current) {
        Runner.stop(runnerRef.current);
      }
      if (renderRef.current) {
        Render.stop(renderRef.current);
      }
      if (engineRef.current) {
        Engine.clear(engineRef.current);
      }
      if (canvasRef.current && canvasRef.current.parentNode) {
        canvasRef.current.parentNode.removeChild(canvasRef.current);
      }
    };
  }, [
    isPhysicsEnabled,
    words,
    currentPage,
    setSelectedWordIndex,
    setCurrentPage,
    setInputValue,
    inputRef,
  ]);

  // 물리 엔진이 비활성화된 경우 정적 레이아웃 사용
  if (!isPhysicsEnabled) {
    return (
      <div ref={containerRef} className="word-bubbles">
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

                if (currentPage !== "input") return;

                if (word.note || word.uploadedFile) {
                  setSelectedWordIndex(i);
                  setCurrentPage("detail");
                } else {
                  setInputValue(word.text);
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
                    <img
                      src={word.faceImage}
                      alt="Face"
                      className="face-image"
                    />
                  )}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return <div ref={containerRef} className="word-bubbles" />;
}

export default WordBubbles;
