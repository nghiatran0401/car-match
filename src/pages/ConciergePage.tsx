import { useState, useRef, useEffect } from 'react';

const samplePrompts = [
  "Which Vroom model is best for a family of four?",
  "Estimate the monthly payment with $8,000 down over 60 months.",
  "I live in an apartment. What charging setup makes sense?"
];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ConciergePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        `Based on your needs, I'd recommend the Vroom Monjaro for its excellent balance of comfort, space, and value. It's perfect for families who prioritize highway comfort and premium features without flagship pricing.`,
        `For apartment dwellers, I recommend Level 2 home charging if you have access to a dedicated parking spot. Otherwise, public DC fast chargers can get you from 10-80% in about 30 minutes. The EX5 and EC40 both support rapid charging.`,
        `With $8,000 down over 60 months at 4.9% APR on a 1.2b VND vehicle, your estimated monthly payment would be around 19-21 million VND. Would you like me to adjust any of these parameters?`
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      const assistantMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: randomResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_28%),linear-gradient(180deg,_#e2e8f0_0%,_#f8fafc_28%,_#fff_100%)]">
      {/* Header */}
      <header className="border-b border-brandSecondary-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brandHighlight-500 text-white shadow-lg">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-brandSecondary-900">Vroom Concierge</h1>
              <p className="text-xs text-brandSecondary-500">Your AI automotive assistant</p>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-hidden">
        <div className="mx-auto flex h-full max-w-5xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          {/* Messages */}
          <div className="flex-1 space-y-4 overflow-y-auto pb-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brandHighlight-100 text-brandHighlight-600">
                  <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-brandSecondary-900">How can I help you today?</h2>
                <p className="mt-2 max-w-md text-brandSecondary-600">
                  Ask me anything about vehicles, financing options, charging setups, or compare models.
                </p>
                
                {/* Sample Prompts */}
                <div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {samplePrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(prompt)}
                      className="rounded-xl border border-brandSecondary-200 bg-white p-4 text-left text-sm text-brandSecondary-700 transition-all hover:-translate-y-0.5 hover:border-brandHighlight-300 hover:shadow-md"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                        message.role === 'user'
                          ? 'rounded-br-md bg-brandHighlight-500 text-white'
                          : 'rounded-bl-md bg-white text-brandSecondary-800 shadow-md ring-1 ring-brandSecondary-100'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      <p className={`mt-2 text-xs ${message.role === 'user' ? 'text-white/70' : 'text-brandSecondary-400'}`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-md bg-white px-5 py-4 shadow-md ring-1 ring-brandSecondary-100">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-brandHighlight-500"></div>
                        <div className="h-2 w-2 animate-bounce rounded-full bg-brandHighlight-500" style={{ animationDelay: '0.1s' }}></div>
                        <div className="h-2 w-2 animate-bounce rounded-full bg-brandHighlight-500" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="mt-4">
            <div className="flex items-end gap-3 rounded-[1.5rem] border border-brandSecondary-200 bg-white p-3 shadow-lg">
              <textarea
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Ask about vehicles, payments, or charging..."
                rows={1}
                disabled={isLoading}
                className="max-h-32 min-h-[44px] flex-1 resize-none border-0 bg-transparent px-3 py-2 text-sm text-brandSecondary-800 outline-none placeholder:text-brandSecondary-400 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brandHighlight-500 text-white shadow-md transition-all hover:bg-brandHighlight-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-brandSecondary-400">
              Press Enter to send, Shift+Enter for new line
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
