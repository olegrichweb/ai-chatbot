import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

const PERSONAS = [
  { id: 'general', label: '🤖 General Assistant', prompt: 'You are a helpful AI assistant.' },
  { id: 'code', label: '👨‍💻 Code Helper', prompt: 'You are an expert programmer. Always provide code examples with explanations. Use markdown code blocks.' },
  { id: 'support', label: '🎧 Customer Support', prompt: 'You are a friendly customer support agent for a tech startup. Be concise, empathetic and solution-focused. Do not invent a company name or personal name unless asked.' },
  { id: 'business', label: '💼 Business Advisor', prompt: 'You are a business consultant. Give practical, actionable advice for entrepreneurs and startups.' },
]

function useTypewriter(text, speed = 15) {
  const [displayed, setDisplayed] = useState('')
  useEffect(() => {
    setDisplayed('')
    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) clearInterval(interval)
    }, speed)
    return () => clearInterval(interval)
  }, [text])
  return displayed
}

function BotMessage({ text }) {
  const displayed = useTypewriter(text)
  return (
    <ReactMarkdown
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          return !inline && match ? (
            <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" {...props}>
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code style={{background: '#374151', padding: '2px 6px', borderRadius: '4px'}} {...props}>
              {children}
            </code>
          )
        }
      }}
    >
      {displayed}
    </ReactMarkdown>
  )
}

function App() {
  const [persona, setPersona] = useState(PERSONAS[0])
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hi! I\'m an AI assistant. How can I help you today?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const [isListening, setIsListening] = useState(false)
const recognitionRef = useRef(null)
const [voiceLang, setVoiceLang] = useState('en-US')
const [showLangMenu, setShowLangMenu] = useState(false)
useEffect(() => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) return

  const recognition = new SpeechRecognition()
  recognition.continuous = false
  recognition.interimResults = false
  recognition.lang = voiceLang

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript
    setInput(prev => prev + transcript)
  }

  recognition.onend = () => setIsListening(false)
  recognitionRef.current = recognition
}, [voiceLang])
const toggleListening = () => {
  if (!recognitionRef.current) {
    alert('Voice input is not supported in this browser. Try Chrome.')
    return
  }
  if (isListening) {
    recognitionRef.current.stop()
    setIsListening(false)
  } else {
    recognitionRef.current.start()
    setIsListening(true)
  }
}

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handlePersonaChange = (p) => {
    setPersona(p)
    setMessages([{ role: 'bot', text: `Switched to ${p.label} mode! How can I help you?` }])
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMessage }])
    setLoading(true)

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          max_tokens: 500,
          messages: [
            { role: 'system', content: persona.prompt },
            ...messages.filter(m => m.role !== 'bot' || messages.indexOf(m) > 0).map(m => ({
              role: m.role === 'bot' ? 'assistant' : 'user',
              content: m.text
            })),
            { role: 'user', content: userMessage }
          ]
        })
      })
      const data = await response.json()
      const botReply = data.choices[0].message.content
      setMessages(prev => [...prev, { role: 'bot', text: botReply }])
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', text: 'Sorry, something went wrong.' }])
    }
    setLoading(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') sendMessage()
  }
const setReaction = (index, type) => {
  setMessages(prev => prev.map((m, i) =>
    i === index ? { ...m, reaction: m.reaction === type ? null : type } : m
  ))
}
return (
    <>
      <div className="header">
        <h1>AI Assistant</h1>
        <p>Powered by Groq AI</p>
        <div className="personas">
          {PERSONAS.map(p => (
            <button
              key={p.id}
              className={`persona-btn ${persona.id === p.id ? 'active' : ''}`}
              onClick={() => handlePersonaChange(p)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message-row ${msg.role}`}>
            <div className={`avatar ${msg.role}`}>
              {msg.role === 'bot' ? '🤖' : '👤'}
            </div>
            <div className={`message ${msg.role}`}>
  {msg.role === 'bot' ? <BotMessage text={msg.text} /> : msg.text}
  {msg.role === 'bot' && i > 0 && (
    <div className="reactions">
      <button
        className={`reaction-btn ${msg.reaction === 'up' ? 'active' : ''}`}
        onClick={() => setReaction(i, 'up')}
      >👍</button>
      <button
        className={`reaction-btn ${msg.reaction === 'down' ? 'active' : ''}`}
        onClick={() => setReaction(i, 'down')}
      >👎</button>
    </div>
  )}
</div>
          </div>
        ))}
        {loading && (
          <div className="message-row bot">
            <div className="avatar bot">🤖</div>
            <div className="message bot loading">Thinking...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-wrapper">
        <div className="input-area">
<div className="lang-picker">
  <button
    className="lang-current"
    onClick={() => setShowLangMenu(!showLangMenu)}
    type="button"
  >
    {voiceLang.split('-')[0].toUpperCase()}
  </button>
  {showLangMenu && (
    <div className="lang-dropdown">
      {[
        { code: 'en-US', label: 'EN' },
        { code: 'de-DE', label: 'DE' },
        { code: 'ru-RU', label: 'RU' },
        { code: 'uk-UA', label: 'UA' },
      ].map(lang => (
        <button
  key={lang.code}
  className={`lang-option ${voiceLang === lang.code ? 'active' : ''}`}
  onClick={() => { setVoiceLang(lang.code); setShowLangMenu(false) }}
>
  {lang.label}
</button>
      ))}
    </div>
  )}
</div>
<button
  onClick={toggleListening}
  className={`mic-btn ${isListening ? 'listening' : ''}`}
  type="button"
>
  {isListening ? '🔴' : '🎤'}
</button>
  <input
    value={input}
    onChange={e => setInput(e.target.value)}
    onKeyDown={handleKeyDown}
    placeholder="Type a message..."
    disabled={loading}
  />
  <button onClick={sendMessage} disabled={loading}>Send →</button>
</div>
      </div>
    </>
  )
  }

export default App