import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

interface MariaAssistantProps {
  onClose?: () => void;
}

export default function MariaAssistant({ onClose }: MariaAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Привіт! Я Марія, адміністратор барбершопу STILEVO 💈 Чим можу допомогти? Можу розповісти про послуги або записати вас на стрижку!'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = { role: 'user', text: trimmed };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: newMessages.slice(1, -1).map(m => ({
            role: m.role,
            text: m.text
          }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Помилка сервера');
      }

      setMessages(prev => [
        ...prev,
        { role: 'assistant', text: data.reply }
      ]);
    } catch (err) {
      console.error('Maria assistant error:', err);
      setError('Марія тимчасово недоступна. Спробуйте ще раз.');
      setMessages(prev => prev.slice(0, -1));
      setInput(trimmed);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#0f0f0f',
      color: '#fff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '16px',
        background: '#1a1a1a',
        borderBottom: '1px solid #2a2a2a',
        gap: 12,
      }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #c9a96e, #8b6914)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          flexShrink: 0,
        }}>
          💈
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Марія</div>
          <div style={{ fontSize: 12, color: '#c9a96e' }}>AI-адміністратор STILEVO</div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#888',
            fontSize: 24, cursor: 'pointer', padding: 4,
          }}>×</button>
        )}
      </div>

      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '80%',
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: msg.role === 'user' ? 'linear-gradient(135deg, #c9a96e, #8b6914)' : '#1e1e1e',
              color: '#fff',
              fontSize: 14,
              lineHeight: 1.5,
              border: msg.role === 'assistant' ? '1px solid #2a2a2a' : 'none',
            }}>
              {msg.text}
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '10px 18px',
              borderRadius: '18px 18px 18px 4px',
              background: '#1e1e1e',
              border: '1px solid #2a2a2a',
              display: 'flex', gap: 6, alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#c9a96e',
                  animation: `bounce 1.2s infinite ${i * 0.2}s`,
                }} />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div style={{
            background: '#2a1010', border: '1px solid #5a2020',
            borderRadius: 10, padding: '10px 14px',
            fontSize: 13, color: '#ff6b6b',
          }}>
            ⚠️ {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{
        padding: '12px 16px', background: '#1a1a1a',
        borderTop: '1px solid #2a2a2a', display: 'flex', gap: 8,
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Напишіть повідомлення..."
          disabled={isLoading}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 24,
            border: '1px solid #2a2a2a', background: '#0f0f0f',
            color: '#fff', fontSize: 14, outline: 'none',
          }}
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            background: isLoading || !input.trim() ? '#2a2a2a' : 'linear-gradient(135deg, #c9a96e, #8b6914)',
            border: 'none',
            cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0, transition: 'background 0.2s',
          }}
        >
          ➤
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
