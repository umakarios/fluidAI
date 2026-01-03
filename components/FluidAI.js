import { useState, useRef, useEffect } from 'react';

export default function FluidAI() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [fluiditySettings, setFluiditySettings] = useState({
    meaning: 0,
    emotion: 0,
    logic: 0,
    context: 0
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userInput = input.trim();
    setInput('');
    setIsProcessing(true);

    // ユーザーメッセージを追加
    setMessages(prev => [...prev, {
      type: 'user',
      content: userInput
    }]);

    // ローディングメッセージを追加
    setMessages(prev => [...prev, {
      type: 'loading',
      content: '処理中...'
    }]);

    try {
      const userAdjust = Object.fromEntries(
        Object.entries(fluiditySettings).filter(([_, v]) => v !== 0)
      );

      const response = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userInput,
          userAdjust: Object.keys(userAdjust).length > 0 ? userAdjust : {}
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }

      // ローディングメッセージを削除してAI応答を追加
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.type !== 'loading');
        return [...filtered, {
          type: 'ai',
          content: data,
          layerMaps: data.layerMaps,
          ranked: data.ranked
        }];
      });

      // 履歴に保存
      setHistory(prev => [...prev, data]);

    } catch (error) {
      console.error('Error:', error);
      
      // エラーメッセージを表示
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.type !== 'loading');
        return [...filtered, {
          type: 'error',
          content: `エラーが発生しました: ${error.message}`
        }];
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const resetFluiditySettings = () => {
    setFluiditySettings({
      meaning: 0,
      emotion: 0,
      logic: 0,
      context: 0
    });
  };

  return (
    <div className="fluid-ai-container">
      <div className="main-area">
        {/* ヘッダー */}
        <div className="header">
          <h1>流体自己最適化AI</h1>
          <div className="header-buttons">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="icon-btn"
              title="履歴"
            >
              📊
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="icon-btn"
              title="設定"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* チャットエリア */}
        <div className="chat-area">
          {messages.length === 0 && (
            <div className="welcome-message">
              <h2>メッセージを入力して対話を開始してください</h2>
              <p>Claude APIを使用した本格的なAI処理</p>
            </div>
          )}
          
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.type}`}>
              <div className="message-content">
                {msg.type === 'user' && <p>{msg.content}</p>}
                
                {msg.type === 'loading' && (
                  <div className="loading">
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                  </div>
                )}
                
                {msg.type === 'error' && <p className="error-text">{msg.content}</p>}
                
                {msg.type === 'ai' && msg.ranked && (
                  <div className="layers">
                    {msg.ranked.map(([layer, data], i) => (
                      <div key={i} className="layer-item">
                        <div className="layer-header">
                          <span className="layer-name">{layer}</span>
                          <div className="fluidity-bar">
                            <div 
                              className="fluidity-fill"
                              style={{ width: `${data.fluidity * 100}%` }}
                            />
                          </div>
                          <span className="fluidity-value">
                            {typeof data.fluidity === 'number' 
                              ? data.fluidity.toFixed(3) 
                              : parseFloat(data.fluidity).toFixed(3)}
                          </span>
                        </div>
                        <p className="layer-content">{data.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* 入力エリア */}
        <div className="input-area">
          <div className="input-container">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="メッセージを入力..."
              disabled={isProcessing}
              className="input-field"
            />
            <button
              onClick={handleSend}
              disabled={isProcessing}
              className="send-btn"
            >
              送信
            </button>
          </div>
        </div>
      </div>

      {/* サイドパネル */}
      {(showSettings || showHistory) && (
        <div className="side-panel">
          {showSettings && (
            <div className="settings-panel">
              <div className="panel-header">
                <h3>📊 流動性調整</h3>
                <button onClick={resetFluiditySettings} className="reset-btn">
                  リセット
                </button>
              </div>
              
              {Object.entries(fluiditySettings).map(([layer, value]) => (
                <div key={layer} className="slider-container">
                  <div className="slider-header">
                    <span className="slider-label">{layer}</span>
                    <span className="slider-value">
                      {value > 0 ? '+' : ''}{value.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-0.3"
                    max="0.3"
                    step="0.01"
                    value={value}
                    onChange={(e) => setFluiditySettings(prev => ({
                      ...prev,
                      [layer]: parseFloat(e.target.value)
                    }))}
                    className="slider"
                  />
                </div>
              ))}
              
              <div className="info-box">
                <p><strong>調整方法:</strong></p>
                <p>各レイヤーの流動性を-0.3から+0.3の範囲で調整できます。</p>
              </div>
            </div>
          )}

          {showHistory && (
            <div className="history-panel">
              <h3>📜 処理履歴</h3>
              {history.length === 0 ? (
                <p className="empty-history">履歴がありません</p>
              ) : (
                <div className="history-list">
                  {history.slice().reverse().map((item, idx) => (
                    <div key={idx} className="history-item">
                      <div className="history-label">
                        入力 #{history.length - idx}
                      </div>
                      <div className="history-input">{item.input}</div>
                      <div className="history-bars">
                        {item.ranked.map(([layer, data], i) => (
                          <div key={i} className="mini-bar">
                            <span className="mini-label">{layer}</span>
                            <div className="mini-bar-container">
                              <div 
                                className="mini-bar-fill"
                                style={{ width: `${data.fluidity * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}