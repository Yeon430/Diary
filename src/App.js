import './App.css';
import { useState, useEffect, useRef } from 'react';

function App() {
  const [bubblePositions, setBubblePositions] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [inputWidth, setInputWidth] = useState('100%');
  const [currentPage, setCurrentPage] = useState('input'); // 'input', 'feeling', 'note', 'upload', or 'detail'
  const [selectedWordIndex, setSelectedWordIndex] = useState(null); // 선택된 단어 박스의 인덱스
  const [isDrawing, setIsDrawing] = useState(false);
  const [noteValue, setNoteValue] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [drawnFaceImage, setDrawnFaceImage] = useState(null);
  const [savedInputValue, setSavedInputValue] = useState(''); // 메인 페이지에서 입력한 단어 저장
  const [showLayerMessage, setShowLayerMessage] = useState(false); // "One more layer added!" 메시지 표시
  const [newBoxIndex, setNewBoxIndex] = useState(null); // 새로 추가된 박스의 인덱스
  const bubblesRef = useRef(null);
  const animationRef = useRef(null);
  const inputRef = useRef(null);
  const measureRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [words, setWords] = useState([
    { text: 'LA', icon: true },
    { text: 'PAris', icon: true },
    { text: 'Movie', icon: true }
  ]);

  useEffect(() => {
    if (!bubblesRef.current) return;

    const container = bubblesRef.current;
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    // 박스의 실제 크기 계산 함수
    const getBubbleSize = (word) => {
      if (word.isCircle) {
        return { width: 60, height: 60 };
      }
      // 텍스트 길이 기반으로 대략적인 크기 계산
      // padding: 12px 20px, font-size: 32px, gap: 10px, circle-icon: 32px
      const textWidth = word.text.length * 20; // 대략적인 문자 너비
      const width = textWidth + 40 + 32 + 20; // 텍스트 + padding + icon + gap
      const height = 56; // padding 12px * 2 + font-size 32px
      return { width: Math.max(width, 100), height };
    };

    // 초기 위치 설정 (위에서 랜덤하게 시작) - verlet 방식
    const initialPositions = words.map((word, i) => {
      const size = getBubbleSize(word);
      const halfWidth = size.width / 2;
      const halfHeight = size.height / 2;
      
      // 새로 추가된 박스인지 확인
      const isNewBox = i === newBoxIndex && newBoxIndex !== null;
      
      // 기존 박스의 위치를 유지 (이전 위치가 있으면 사용)
      const existingPos = bubblePositions[i];
      if (existingPos && !isNewBox) {
        // 기존 박스는 현재 위치와 상태 모두 유지
        return {
          ...existingPos,
          width: size.width,
          height: size.height,
          // isResting 상태 유지
          isResting: existingPos.isResting || false,
          restX: existingPos.restX,
          restY: existingPos.restY,
          restRotation: existingPos.restRotation
        };
      }
      
      // 새 박스는 화면 정가운데에서 시작
      if (isNewBox) {
        const pauseY = containerHeight * 0.3; // 화면 상단 30% 위치에서 정지
        const centerX = containerWidth / 2; // 화면 정가운데
        
        return {
          x: centerX,
          y: pauseY,
          px: centerX,
          py: pauseY,
          fx: 0,
          fy: 0,
          rotation: (Math.random() - 0.5) * 10,
          rotationSpeed: (Math.random() - 0.5) * 0.1,
          width: size.width,
          height: size.height,
          isPaused: true,
          pauseStartTime: Date.now()
        };
      }
      
      // 기존 박스가 없으면 위에서 시작 (초기 로드 시)
      const minX = halfWidth + 10;
      const maxX = Math.max(containerWidth - halfWidth - 10, minX);
      const x = minX + Math.random() * (maxX - minX);
      const y = -50 - i * 150;
      
      return {
        x: x,
        y: y,
        px: x,
        py: y,
        fx: 0,
        fy: 0,
        rotation: (Math.random() - 0.5) * 10,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        width: size.width,
        height: size.height
      };
    });

    setBubblePositions(initialPositions);

    const GRAVITY = 0.6; // 중력
    const DAMPING = 0.98; // 감쇠 (매우 높게 설정하여 튀는 현상 완전히 제거)
    const SPEED = 0.1; // 속도 더 느리게
    const BUBBLE_RADIUS = 120; // 박스의 대략적인 반지름
    const REST_THRESHOLD = 0.2; // 정지 임계값 (낮춰서 바닥에 더 확실히 닿게)
    const REST_DISTANCE = 20; // 바닥에서의 거리 임계값 (늘려서 더 빨리 정지)
    const SAFE_MARGIN = 5; // 경계에서의 안전 여유 공간
    const FLOOR_OFFSET = 180; // 바닥 위치 오프셋 (이 값을 조정하면 바닥 위치가 변경됩니다)
    const COLLISION_ITERATIONS = 5; // 충돌 해결 반복 횟수 (간격 유지를 위해 증가)
    const COLLISION_SPACING = 5; // 박스 간 최소 간격 (px) - 이 값을 조정하면 박스 간 거리가 변경됨

    const applyForce = (pos, delta, containerHeight) => {
      // 정지 상태인 박스는 완전히 건너뛰기
      if (pos.isResting) {
        return;
      }
      
      // 일시정지 상태인 박스는 힘을 적용하지 않음 (1~2초 후 해제)
      if (pos.isPaused) {
        const pauseDuration = Date.now() - (pos.pauseStartTime || Date.now());
        if (pauseDuration >= 1500) { // 1.5초 후 일시정지 해제
          pos.isPaused = false;
          pos.pauseStartTime = null;
        } else {
          return; // 아직 일시정지 중이면 힘 적용 안 함
        }
      }
      
      // 바닥에 닿아서 정지한 박스는 힘을 적용하지 않음
      const actualFloorHeight = containerHeight - FLOOR_OFFSET; // 바닥 위치 계산
      const boxHeight = pos.height || BUBBLE_RADIUS * 2;
      const distanceToBottom = actualFloorHeight - (pos.y + boxHeight / 2);
      const isAtBottom = distanceToBottom <= REST_DISTANCE;
      const vel_x = pos.x - pos.px;
      const vel_y = pos.y - pos.py;
      const speed = Math.sqrt(vel_x * vel_x + vel_y * vel_y);
      
      // 바닥에 닿았거나 거의 닿았으면 힘 적용 안 함
      if (isAtBottom || (distanceToBottom <= REST_DISTANCE + 10 && speed < REST_THRESHOLD)) {
        // 정지한 박스는 힘 적용 안 함
        pos.fx = 0;
        pos.fy = 0;
        return;
      }
      
      // 중력 적용 (수평 이동 최소화)
      delta *= delta;
      pos.fy += GRAVITY;
      // 수평 힘은 거의 적용하지 않음
      pos.x += pos.fx * delta * 0.01; // 수평 이동 거의 없음
      pos.y += pos.fy * delta;
      pos.fx = 0;
      pos.fy = 0;
    };

    const verlet = (pos, containerHeight) => {
      // 정지 상태인 박스는 완전히 건너뛰기
      if (pos.isResting) {
        return;
      }
      
      // 일시정지 상태인 박스는 위치 업데이트 안 함
      if (pos.isPaused) {
        return;
      }
      
      // 바닥에 닿아서 정지한 박스는 verlet 적용 안 함
      const actualFloorHeight = containerHeight - FLOOR_OFFSET; // 바닥 위치 계산
      const boxHeight = pos.height || BUBBLE_RADIUS * 2;
      const distanceToBottom = actualFloorHeight - (pos.y + boxHeight / 2);
      const isAtBottom = distanceToBottom <= REST_DISTANCE;
      const vel_x = pos.x - pos.px;
      const vel_y = pos.y - pos.py;
      const speed = Math.sqrt(vel_x * vel_x + vel_y * vel_y);
      
      // 바닥에 닿았거나 거의 닿았으면 움직이지 않음
      if (isAtBottom || (distanceToBottom <= REST_DISTANCE + 10 && speed < REST_THRESHOLD)) {
        // 정지한 박스는 움직이지 않음
        return;
      }
      
      // 수평 이동 최소화
      const nx = pos.x; // 수평은 거의 움직이지 않음
      const ny = (pos.y * 2) - pos.py; // 수직만 이동
      pos.px = pos.x;
      pos.py = pos.y;
      pos.x = nx;
      pos.y = ny;
    };

    const resolveCollisions = (positions, ip) => {
      // 여러 번 반복해서 확실히 분리 (간격 유지)
      for (let iter = 0; iter < COLLISION_ITERATIONS; iter++) {
        for (let i = 0; i < positions.length; i++) {
          const box1 = positions[i];
          // 정지 상태인 박스는 충돌 해결에서 제외
          if (box1.isResting) continue;
          
          const w1 = box1.width || BUBBLE_RADIUS * 2;
          const h1 = box1.height || BUBBLE_RADIUS * 2;

          for (let j = i + 1; j < positions.length; j++) {
            const box2 = positions[j];
            // 정지 상태인 박스는 충돌 해결에서 제외
            if (box2.isResting) continue;
            
            const w2 = box2.width || BUBBLE_RADIUS * 2;
            const h2 = box2.height || BUBBLE_RADIUS * 2;

            // AABB 충돌 감지 (직사각형 테두리 + 간격)
            const left1 = box1.x - w1 / 2;
            const right1 = box1.x + w1 / 2;
            const top1 = box1.y - h1 / 2;
            const bottom1 = box1.y + h1 / 2;

            const left2 = box2.x - w2 / 2;
            const right2 = box2.x + w2 / 2;
            const top2 = box2.y - h2 / 2;
            const bottom2 = box2.y + h2 / 2;

            // 최소 간격을 포함한 거리 계산
            const minSeparationX = (w1 + w2) / 2 + COLLISION_SPACING;
            const minSeparationY = (h1 + h2) / 2 + COLLISION_SPACING;
            
            const diff_x = box1.x - box2.x;
            const diff_y = box1.y - box2.y;
            const dist_x = Math.abs(diff_x);
            const dist_y = Math.abs(diff_y);

            // 간격이 부족한지 확인
            const needsSeparationX = dist_x < minSeparationX;
            const needsSeparationY = dist_y < minSeparationY;

            if (needsSeparationX && needsSeparationY) {
              // 겹침이 있으면 점진적으로 분리
              const separationX = minSeparationX - dist_x;
              const separationY = minSeparationY - dist_y;
              
              // 점진적이고 부드러운 분리 (순간이동 방지)
              let moveX = 0;
              let moveY = 0;
              
              // Y축 분리 (주로 수직)
              if (separationY > 0) {
                // 위에 있는 박스는 약간 위로, 아래에 있는 박스는 약간 아래로
                if (box1.y < box2.y) {
                  moveY = -separationY * 0.1; // 점진적 분리
                } else {
                  moveY = separationY * 0.1; // 점진적 분리
                }
              }
              
              // X축 분리 (최소한만)
              if (separationX > 0 && separationX > separationY) {
                moveX = (diff_x > 0 ? 1 : -1) * separationX * 0.05; // 매우 작은 수평 이동
              }

              // 점진적 분리
              box1.x += moveX;
              box1.y += moveY;
              box2.x -= moveX;
              box2.y -= moveY;

              // 작용 반작용 제거 - 수평 속도 완전히 제거, 수직 속도만 유지
              if (ip) {
                const vel_x1 = box1.x - box1.px;
                const vel_y1 = box1.y - box1.py;
                const vel_x2 = box2.x - box2.px;
                const vel_y2 = box2.y - box2.py;

                // 수평 속도는 완전히 제거, 수직 속도는 유지
                box1.px = box1.x; // 수평 속도 완전히 제거
                box1.py = box1.y - vel_y1; // 수직 속도 유지
                box2.px = box2.x; // 수평 속도 완전히 제거
                box2.py = box2.y - vel_y2; // 수직 속도 유지
              }
            }
          }
        }
      }
    };

    const checkWalls = (positions, containerHeight) => {
      // 실제 바닥 높이 계산
      const actualFloorHeight = containerHeight - FLOOR_OFFSET; // 바닥 위치 계산
      
      for (let i = 0; i < positions.length; i++) {
        const box = positions[i];
        
        // 정지 상태인 박스는 위치를 고정하고 벽 체크 건너뛰기
        if (box.isResting) {
          box.x = box.restX;
          box.y = box.restY;
          box.px = box.restX;
          box.py = box.restY;
          continue;
        }
        
        const boxWidth = box.width || BUBBLE_RADIUS * 2;
        const boxHeight = box.height || BUBBLE_RADIUS * 2;
        const halfWidth = boxWidth / 2;
        const halfHeight = boxHeight / 2;

        // 왼쪽 경계 체크 (수평 이동 최소화)
        if (box.x < halfWidth) {
          box.x = halfWidth;
          box.px = box.x; // 수평 속도 완전히 제거
        }
        // 오른쪽 경계 체크 (수평 이동 최소화)
        else if (box.x + halfWidth > containerWidth) {
          box.x = containerWidth - halfWidth;
          box.px = box.x; // 수평 속도 완전히 제거
        }

        // 위쪽 경계 체크
        if (box.y < halfHeight) {
          const vel_y = box.py - box.y;
          box.y = halfHeight;
          box.py = box.y - vel_y * DAMPING;
        }
        // 바닥 경계 체크 - 바닥에 닿으면 즉시 완전히 정지 (더 엄격하게)
        const distanceToBottom = actualFloorHeight - (box.y + halfHeight);
        if (distanceToBottom <= REST_DISTANCE || box.y + halfHeight >= actualFloorHeight) {
          // 바닥 위치로 고정 (박스가 보이도록)
          box.y = Math.max(halfHeight, actualFloorHeight - halfHeight);
          
          // 즉시 완전히 정지 (속도도 0으로, 튀지 않게)
          box.py = box.y;
          box.px = box.x;
          box.fx = 0;
          
          // 회전도 완전히 고정
          if (box.rotationSpeed !== 0) {
            box.rotationSpeed = 0;
            // 현재 rotation 값을 고정 (더 이상 변경되지 않음)
            if (box.fixedRotation === undefined) {
              box.fixedRotation = box.rotation;
            }
          }
          box.fy = 0;
          
          // 추가 안전장치: 바닥 근처에서는 수직 속도를 강제로 0으로
          const vel_y = box.py - box.y;
          if (Math.abs(vel_y) > 0.1) {
            box.py = box.y; // 수직 속도 완전히 제거
          }
        }
      }
    };

    const animate = () => {
      setBubblePositions(prev => {
        // 초기화되지 않았으면 빈 배열 반환
        if (!prev || prev.length === 0) {
          return [];
        }
        
        let newPositions = prev.map(pos => ({ ...pos }));

        const iter = 6;
        const delta = SPEED / iter;

        for (let iteration = 0; iteration < iter; iteration++) {
          // 힘 적용 (정지 상태 박스 제외)
          for (let i = 0; i < newPositions.length; i++) {
            if (newPositions[i].isResting) continue; // 정지 상태 박스는 건너뛰기
            applyForce(newPositions[i], delta, containerHeight);
            verlet(newPositions[i], containerHeight);
          }

          // 충돌 해결
          resolveCollisions(newPositions, false);
          checkWalls(newPositions, containerHeight);

          // 다시 verlet (정지 상태 박스 제외)
          for (let i = 0; i < newPositions.length; i++) {
            if (newPositions[i].isResting) continue; // 정지 상태 박스는 건너뛰기
            verlet(newPositions[i], containerHeight);
          }

          // 충돌 해결 (impulse 포함)
          resolveCollisions(newPositions, true);
          checkWalls(newPositions, containerHeight);
        }

        // 바닥에 닿아서 정지한 박스는 완전히 정지
        const actualFloorHeight = containerHeight - FLOOR_OFFSET; // 바닥 위치 계산
        for (let i = 0; i < newPositions.length; i++) {
          const pos = newPositions[i];
          const boxHeight = pos.height || BUBBLE_RADIUS * 2;
          const distanceToBottom = actualFloorHeight - (pos.y + boxHeight / 2);
          const isAtBottom = distanceToBottom <= REST_DISTANCE;
          
          // 바닥에 닿으면 완전히 정지 (더 엄격하게, 튀지 않게)
          if (isAtBottom) {
            // 정지 상태 플래그 설정
            if (!pos.isResting) {
              pos.isResting = true;
              pos.restX = pos.x;
              pos.restY = pos.y;
              pos.restRotation = pos.rotation;
            }
            
            // 위치를 완전히 고정 (물리 시뮬레이션 결과 무시)
            pos.x = pos.restX;
            pos.y = pos.restY;
            pos.px = pos.restX;
            pos.py = pos.restY;
            pos.rotation = pos.restRotation;
            pos.rotationSpeed = 0;
            pos.fx = 0;
            pos.fy = 0;
          } else {
            // 바닥에 닿지 않은 경우에만 회전 업데이트
            pos.rotation += pos.rotationSpeed;
            pos.isResting = false;
          }
        }

        return newPositions;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [words.length, newBoxIndex]); // words.length와 newBoxIndex를 의존성에 추가

  // Canvas 초기화
  useEffect(() => {
    if (currentPage === 'feeling' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // 캔버스 크기 설정 (고정 크기)
      const container = canvas.parentElement;
      if (container) {
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        // 그리기 스타일 설정
        ctx.strokeStyle = '#364C41';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [currentPage]);

  if (currentPage === 'feeling') {
    return (
      <div className="App">
        <div className="main-container">
          {/* Back button */}
          <button 
            className="back-button"
            onClick={() => setCurrentPage('input')}
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              zIndex: 1000
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#364C41" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>

          {/* Header */}
          <div className="header">
          </div>

          {/* Chat section with avatar */}
          <div className="chat-section">
            <div className="chat-bubble" style={{ visibility: 'hidden' }}>
              If you need some advise..
            </div>
            <div className="avatar feeling-avatar"></div>
          </div>

          {/* Question section */}
          <div className="feeling-question-section">
            <div className="feeling-question-text">How are you</div>
            <div className="feeling-question-text">feeling today?</div>
          </div>

          {/* Emotion face with canvas */}
          <div className="emotion-face-container">
            <div className="emotion-face">
              <div className="emotion-eyes">
                <div className="emotion-eye"></div>
                <div className="emotion-eye"></div>
              </div>
              <div className="emotion-mouth"></div>
            </div>
            <canvas
              ref={canvasRef}
              className="drawing-canvas"
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDrawing(true);
                const canvas = canvasRef.current;
                if (!canvas) return;
                const rect = canvas.getBoundingClientRect();
                const ctx = canvas.getContext('2d');
                ctx.beginPath();
                ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
              }}
              onMouseMove={(e) => {
                e.preventDefault();
                if (!isDrawing) return;
                const canvas = canvasRef.current;
                if (!canvas) return;
                const rect = canvas.getBoundingClientRect();
                const ctx = canvas.getContext('2d');
                ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                ctx.stroke();
              }}
              onMouseUp={(e) => {
                e.preventDefault();
                setIsDrawing(false);
              }}
              onMouseLeave={(e) => {
                e.preventDefault();
                setIsDrawing(false);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                setIsDrawing(true);
                const canvas = canvasRef.current;
                if (!canvas) return;
                const rect = canvas.getBoundingClientRect();
                const ctx = canvas.getContext('2d');
                const touch = e.touches[0];
                ctx.beginPath();
                ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
              }}
              onTouchMove={(e) => {
                e.preventDefault();
                if (!isDrawing) return;
                const canvas = canvasRef.current;
                if (!canvas) return;
                const rect = canvas.getBoundingClientRect();
                const ctx = canvas.getContext('2d');
                const touch = e.touches[0];
                ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
                ctx.stroke();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                setIsDrawing(false);
              }}
            />
          </div>

          {/* Clear button */}
          <div className="clear-button-section">
            <button 
              className="clear-button"
              onClick={() => {
                const canvas = canvasRef.current;
                if (canvas) {
                  const ctx = canvas.getContext('2d');
                  ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
              }}
            >
              Clear All
            </button>
          </div>

          {/* Next button */}
          <div className="next-button-section">
            <button 
              className="next-button" 
              onClick={() => {
                // feeling 페이지를 떠날 때 그린 얼굴 이미지 저장
                if (canvasRef.current) {
                  const canvas = canvasRef.current;
                  const ctx = canvas.getContext('2d');
                  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                  const hasContent = imageData.data.some((channel, index) => {
                    return index % 4 !== 3 && channel !== 0;
                  });
                  
                  if (hasContent) {
                    const imageDataUrl = canvas.toDataURL('image/png');
                    setDrawnFaceImage(imageDataUrl);
                  }
                }
                setCurrentPage('note');
              }}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentPage === 'note') {
    return (
      <div className="App">
        <div className="main-container">
          {/* Back button */}
          <button 
            className="back-button"
            onClick={() => setCurrentPage('feeling')}
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              zIndex: 1000
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#364C41" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>

          {/* Header */}
          <div className="header">
          </div>

          {/* Chat section with avatar */}
          <div className="chat-section">
            <div className="chat-bubble" style={{ visibility: 'hidden' }}>
              If you need some advise..
            </div>
            <div className="avatar feeling-avatar"></div>
          </div>

          {/* Question section */}
          <div className="note-question-section">
            <div className="note-question-text">Leave a note</div>
            <div className="note-question-text">for yourself.</div>
          </div>

          {/* Note input field */}
          <div className="note-input-section">
            <textarea
              ref={(el) => {
                if (el) {
                  el.style.height = 'auto';
                  el.style.height = `${Math.min(el.scrollHeight, 400)}px`;
                }
              }}
              className="note-input"
              value={noteValue}
              onChange={(e) => {
                setNoteValue(e.target.value);
                const textarea = e.target;
                textarea.style.height = 'auto';
                textarea.style.height = `${Math.min(textarea.scrollHeight, 400)}px`;
              }}
              placeholder=""
            />
          </div>

          {/* Next button */}
          <div className="next-button-section">
            <button className="next-button" onClick={() => setCurrentPage('upload')}>
              Next →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentPage === 'upload') {
    return (
      <div className="App">
        <div className="main-container">
          {/* Back button */}
          <button 
            className="back-button"
            onClick={() => setCurrentPage('note')}
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              zIndex: 1000
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#364C41" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>

          {/* Header */}
          <div className="header">
          </div>

          {/* Chat section with avatar */}
          <div className="chat-section">
            <div className="chat-bubble" style={{ visibility: 'hidden' }}>
              If you need some advise..
            </div>
            <div className="avatar feeling-avatar"></div>
          </div>

          {/* Question section */}
          <div className="upload-question-section">
            <div className="upload-question-text">Want to add</div>
            <div className="upload-question-text">a photo or a</div>
            <div className="upload-question-text">video?</div>
          </div>

          {/* Upload box */}
          <div className="upload-section">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  setUploadedFile(file);
                }
              }}
            />
            <div 
              className="upload-box"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadedFile ? (
                uploadedFile.type.startsWith('image/') ? (
                  <img 
                    src={URL.createObjectURL(uploadedFile)} 
                    alt="Uploaded" 
                    className="uploaded-preview"
                  />
                ) : (
                  <video 
                    src={URL.createObjectURL(uploadedFile)} 
                    className="uploaded-preview"
                    controls
                  />
                )
              ) : (
                <>
                  <svg className="upload-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#364C41" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <div className="upload-text">upload</div>
                </>
              )}
            </div>
          </div>

          {/* Next button */}
          <div className="next-button-section">
            <button 
              className="next-button"
              onClick={() => {
                // 새로운 단어 박스 생성
                if (savedInputValue && drawnFaceImage) {
                  const today = new Date();
                  const year = today.getFullYear();
                  const month = String(today.getMonth() + 1).padStart(2, '0');
                  const day = String(today.getDate()).padStart(2, '0');
                  const dateString = `${year}.${month}.${day}`;
                  
                  const newWord = {
                    text: savedInputValue,
                    icon: true,
                    faceImage: drawnFaceImage,
                    note: noteValue,
                    uploadedFile: uploadedFile,
                    date: dateString,
                    isNew: true // 새 박스 플래그
                  };
                  setWords(prev => {
                    const newIndex = prev.length;
                    setNewBoxIndex(newIndex); // 새 박스 인덱스 저장
                    return [...prev, newWord];
                  });
                  // "One more layer added!" 메시지 표시
                  setShowLayerMessage(true);
                  setTimeout(() => {
                    setShowLayerMessage(false);
                    setNewBoxIndex(null); // 메시지가 사라진 후 새 박스 플래그 초기화
                  }, 3000); // 3초 후 메시지 숨김
                  // 첫 화면으로 돌아가면서 상태 초기화
                  setCurrentPage('input');
                  setInputValue('');
                  setSavedInputValue('');
                  setUploadedFile(null);
                  setNoteValue('');
                  setDrawnFaceImage(null);
                  // 캔버스도 초기화
                  if (canvasRef.current) {
                    const ctx = canvasRef.current.getContext('2d');
                    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                  }
                }
              }}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Detail page (diary entry view)
  if (currentPage === 'detail' && selectedWordIndex !== null) {
    const selectedWord = words[selectedWordIndex];
    return (
      <div className="App">
        <div className="main-container detail-container">
          {/* Back button */}
          <button 
            className="back-button"
            onClick={() => {
              setCurrentPage('input');
              setSelectedWordIndex(null);
            }}
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              zIndex: 100
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
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
              {selectedWord.uploadedFile.type.startsWith('image/') ? (
                <img 
                  src={URL.createObjectURL(selectedWord.uploadedFile)} 
                  alt="Uploaded" 
                  className="detail-image"
                />
              ) : (
                <video 
                  src={URL.createObjectURL(selectedWord.uploadedFile)} 
                  controls 
                  className="detail-image"
                />
              )}
            </div>
          )}

          {/* Footer with avatar, chat bubble, and date */}
          <div className="detail-footer">
            <div className="avatar detail-avatar"></div>
            <div className="detail-chat-bubble">If you need some help..</div>
            {selectedWord.date && (
              <div className="detail-date">{selectedWord.date}</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="main-container">
        {/* Header */}
        <div className="header">
          <div className="settings-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#364C41" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v4m0 12v4M5.64 5.64l2.83 2.83m7.06 7.06l2.83 2.83M2 12h4m12 0h4M5.64 18.36l2.83-2.83m7.06-7.06l2.83-2.83"/>
            </svg>
          </div>
        </div>

        {/* Chat bubble */}
        <div className="chat-section">
          <div className="chat-bubble">
            {showLayerMessage ? 'Great job!' : 'If you need some advise..'}
          </div>
          <div className="avatar"></div>
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
              <span className="greeting">Hi <span className="highlight">Yonoo</span>!</span>
            </div>
            <div className="question-text">What's one</div>
            <div className="question-text">word for your</div>
            <div className="question-text">day today?</div>
          </div>
        )}

        {/* Input field - showLayerMessage일 때는 숨김 */}
        {!showLayerMessage && (
        <div className="input-section">
          <div className={`input-field ${inputValue ? 'has-text' : ''}`}>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inputValue.trim()) {
                  setSavedInputValue(inputValue); // 입력한 단어 저장
                  setCurrentPage('feeling');
                }
              }}
              placeholder=""
              className="input-text"
            />
          </div>
          {inputValue && (
            <div className="submit-button" onClick={() => {
              setSavedInputValue(inputValue); // 입력한 단어 저장
              setCurrentPage('feeling');
            }}>
              <svg className="submit-arrow" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7 4L13 10L7 16" stroke="#364C41" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
        </div>
        )}

        {/* Word bubbles */}
        <div className="word-bubbles" ref={bubblesRef}>
          {words.map((word, i) => {
            const pos = bubblePositions[i];
            
            // 위치가 없거나 초기화되지 않았으면 기본값 사용 (위에서 시작)
            if (!pos || pos.x === undefined || pos.y === undefined) {
              return (
                <div
                  key={i}
                  className={`word-bubble ${word.isCircle ? 'circle-only' : ''}`}
                  style={{
                    position: 'absolute',
                    left: `${50 + i * 20}%`,
                    top: '-100px',
                    transform: 'translate(-50%, -50%)',
                    transition: 'none',
                    willChange: 'transform',
                    opacity: 0.5 // 초기화 중임을 표시
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
            }
            
            return (
              <div
                key={i}
                className={`word-bubble ${word.isCircle ? 'circle-only' : ''}`}
                style={{
                  position: 'absolute',
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  transform: `translate(-50%, -50%) rotate(${pos.rotation || 0}deg)`,
                  transition: 'none',
                  cursor: word.note || word.uploadedFile ? 'pointer' : 'default',
                  pointerEvents: 'auto',
                  willChange: 'auto'
                }}
                onMouseEnter={(e) => {
                  // hover 시 transform을 강제로 유지
                  const currentTransform = e.target.style.transform;
                  e.target.style.transform = currentTransform;
                }}
                onClick={() => {
                  if (word.note || word.uploadedFile) {
                    setSelectedWordIndex(i);
                    setCurrentPage('detail');
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
      </div>
    </div>
  );
}

export default App;
