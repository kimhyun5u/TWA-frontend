import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import './App.css';

// .env 파일에서 API URL 가져오기
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Helper component for toggleable content with timing display
const ToggleableContent = ({ title, content, isThinking = false, role, responseTime }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  // Format time in seconds or milliseconds
  const formatTime = (timeMs) => {
    return `${(timeMs / 1000).toFixed(2)}초`;
  };
  
  return (
    <div className={`toggleable-item ${isThinking ? 'thinking-item' : ''}`}>
      <div className="toggle-header" onClick={() => setIsVisible(!isVisible)}>
        <div className="toggle-title">
          <span className="role-badge">{role}</span>
          {isThinking && <span className="thinking-badge">사고 과정</span>}
          {responseTime && <span className="response-time">{formatTime(responseTime)}</span>}
        </div>
        <button className="toggle-button">
          {isVisible ? '▼' : '▶'}
        </button>
      </div>
      {isVisible && (
        <div className="toggle-content">
          <div className={isThinking ? "cot-container" : "user-query"}>
            <div className="markdown-content">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const App = () => {
  const [inputText, setInputText] = useState('');
  const [userId, setUserId] = useState('');
  const [responseData, setResponseData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [eventSource, setEventSource] = useState(null);
  const [messages, setMessages] = useState([]);

  const [requestStartTime, setRequestStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [responseTimes, setResponseTimes] = useState({});
  const intervalRef = useRef(null);

  // Start timer when loading begins
  useEffect(() => {
    if (isLoading) {
      const startTime = Date.now();
      setRequestStartTime(startTime);
      
      // Set up an interval to update elapsed time every second
      intervalRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      // Clear interval when loading stops
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setElapsedTime(0);
    }
    
    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isLoading]);

  const startSSE = () => {
    if (eventSource) eventSource.close(); // 기존 연결이 있다면 닫기
    
    // Record message timestamps as they arrive
    const messageTimes = {};
    let startTime = Date.now();
    
    const source = new EventSource(`${API_BASE_URL}/prompt?messages=${encodeURIComponent(inputText)}&user_id=${encodeURIComponent(userId)}`);
    source.onmessage = (event) => {
      let d = JSON.parse(event.data);
      d["role"] = d["role"] === null ? "user" : d["role"];
      
      // Record the time this message was received
      const currentTime = Date.now();
      const messageId = `${d.role}`;
      if (messageTimes[messageId] === undefined)
        messageTimes[messageId] = currentTime - startTime;
      else
        messageTimes[messageId] += currentTime - startTime;
      startTime = Date.now();

      setResponseData(prev => {
        if (prev.length > 0 && prev[prev.length - 1].role === d.role) {
          return [...prev.slice(0, prev.length - 1), d];
        }
        return [...prev, d];
      });
      
      // Update response times
      setResponseTimes(messageTimes);
      console.log(responseTimes);
    };
    
    source.addEventListener('end', (event) => {
      console.log("스트리밍 완료:", event.data);
      setIsLoading(false);
      source.close();
    });
  
    source.onerror = (error) => {
      console.error("SSE 에러:", error);
      setIsLoading(false);
      source.close();
    };
  
    setEventSource(source);
  };
  
  const handleInputChange = (e) => {
    setInputText(e.target.value);
  };

  const handleUserIdChange = (e) => {
    setUserId(e.target.value);
  };

  const handleSubmit = async () => {
    if (!inputText.trim()) return;
    
    setIsLoading(true);
    setResponseTimes({});
    setElapsedTime(0);
    setRequestStartTime(Date.now());
    
    try {
      setResponseData([]);
      startSSE();
    } catch (error) {
      console.error('Error sending POST request:', error);
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await fetch(`${API_BASE_URL}/refresh-menu`,
        {
          method: 'POST'
        }
      );
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = async () => {
    setIsLoading(true);
    try {
      await fetch(`${API_BASE_URL}/new-chat?user_id=${encodeURIComponent(userId)}`,
        {
          method: 'POST'
        }
      );
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add a ref for the textarea
  const textAreaRef = React.useRef(null);
  
  // Focus the textarea when component mounts
  React.useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.focus();
    }
  }, []);

  return (
    <div className="app-container">
      <header>
        <h1>TWA: Today What's menu Agent</h1>
      </header>
      
      <main>
        <div className="input-section">
          {/* <div className="user-id-input">
            <input
              type="text"
              value={userId}
              onChange={handleUserIdChange}
              placeholder="사용자 ID를 입력하세요"
              className="user-id-field"
            />
          </div> */}
          
          <textarea
            ref={textAreaRef}
            value={inputText}
            onChange={handleInputChange}
            placeholder="문장을 입력하세요..."
            rows={4}
            autoFocus
          />
          
          <div className="button-group">
            <button 
              onClick={() => {
                setRequestStartTime(Date.now());
                handleSubmit();
              }}
              disabled={isLoading || !inputText.trim()}
              className="submit-button"
            >
              {isLoading ? '전송 중...' : '전송'}
            </button>
            
            <button 
              onClick={handleRefresh}
              disabled={isLoading}
              className="refresh-button"
            >
              {isLoading ? '로딩 중...' : '새로고침'}
            </button>

            {/* <button
              onClick={handleNewChat}
              disabled={isLoading}
              className="new-chat-button"
            >
              {isLoading ? '초기화 중...' :'새 대화'}
            </button> */}
          </div>
        </div>
        {responseData && responseData.length > 0 && (
          <div className="response-section">
            <h2>TWA의 응답 {!isLoading && <span className="response-time">총 응답 시간: {(Object.values(responseTimes).reduce((a,c) => a + c, 0) / 1000).toFixed(2)} 초</span>}</h2>
             {/* data의 형식은 {"messages": [{"role": "calander", "content": "~~~"}]} 으로 구성되어 있다. 마지막 항목 빼고는 참조한 내용들이므로 토글 형식으로 표현해줘*/}
            {responseData && responseData.map((item, index) => {
              const messageId = `${item.role}`;
              const responseTime = responseTimes[messageId];
              
              return isLoading || index !== responseData.length - 1 ? (
                <ToggleableContent 
                  key={index}
                  title={item.role}
                  content={item.content}
                  isThinking={item.role !== "user"}
                  role={item.role === "user" ? "사용자" : `AI 어시스턴트: ${item.role}`}
                  responseTime={responseTime}
                />
              ) : (
                <div key={index} className="response-item final-response">
                  <div className="response-header">
                    <div className="response-header-left">
                      <span className="role-badge">TWA</span>
                      <span className="final-answer-badge">최종 답변</span>
                      {!isLoading && (
                        <span className="response-time">
                          응답 시간: {(responseTime / 1000).toFixed(2)}초
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="response-content">
                    <div className="markdown-content">
                      <ReactMarkdown>{item.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="response-item loading-response">
                <div className="response-header">
                  <span className="role-badge">TWA</span>
                  <span className="thinking-badge">사고 중...</span>
                  <span className="response-time">
                    경과 시간: {elapsedTime}초
                  </span>
                </div>
                <div className="response-content">
                  <div className="thinking-animation"></div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;