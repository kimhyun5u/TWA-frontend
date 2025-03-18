import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import './App.css';

// .env 파일에서 API URL 가져오기
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Add a helper component for toggleable content
const ToggleableContent = ({ title, content, isThinking = false, role }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  return (
    <div className={`toggleable-item ${isThinking ? 'thinking-item' : ''}`}>
      <div className="toggle-header" onClick={() => setIsVisible(!isVisible)}>
        <div className="toggle-title">
          <span className="role-badge">{role}</span>
          {isThinking && <span className="thinking-badge">사고 과정</span>}
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

function App() {
  const [inputText, setInputText] = useState('');
  const [userId, setUserId] = useState('');
  const [responseData, setResponseData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    setInputText(e.target.value);
  };

  const handleUserIdChange = (e) => {
    setUserId(e.target.value);
  };

  const handleSubmit = async () => {
    if (!inputText.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/prompt?messages=${encodeURIComponent(inputText)}&user_id=${encodeURIComponent(userId)}`, 
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      const data = await response.json();
      setResponseData(data);
    } catch (error) {
      console.error('Error sending POST request:', error);
    } finally {
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

  return (
    <div className="app-container">
      <header>
        <h1>TWA: Today What's menu Agent</h1>
      </header>
      
      <main>
        <div className="input-section">
          <div className="user-id-input">
            <input
              type="text"
              value={userId}
              onChange={handleUserIdChange}
              placeholder="사용자 ID를 입력하세요"
              className="user-id-field"
            />
          </div>
          
          <textarea
            value={inputText}
            onChange={handleInputChange}
            placeholder="문장을 입력하세요..."
            rows={4}
          />
          
          <div className="button-group">
            <button 
              onClick={handleSubmit}
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
        
        {responseData && (
          <div className="response-section">
            <h2>TWA의 응답</h2>
             {/* data의 형식은 {"messages": [{"role": "calander", "content": "~~~"}]} 으로 구성되어 있다. 마지막 항목 빼고는 참조한 내용들이므로 토글 형식으로 표현해줘*/}
            {responseData["messages"].map((item, index) => (
              // 마지막이 아닌 경우에만 토글 형식으로 표현
              index !== responseData["messages"].length - 1 ?
              <ToggleableContent 
                key={index}
                title={item.role}
                content={item.content}
                isThinking={item.role !== "menu_recommander"}
                role={item.role === "menu_recommander" ? "사용자" : `AI 어시스턴트: ${item.role}`}
              />
              :
              <div key={index} className="response-item final-response">
                <div className="response-header">
                  <span className="role-badge">TWA</span>
                  <span className="final-answer-badge">최종 답변</span>
                </div>
                <div className="response-content">
                  <div className="markdown-content"><ReactMarkdown>{item.content}</ReactMarkdown></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;