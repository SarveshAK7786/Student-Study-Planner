import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Bot, 
  Send, 
  Sparkles, 
  X, 
  Minimize2, 
  Maximize2, 
  RotateCcw,
  Check,
  Copy,
  Settings,
  Zap,
  Key,
  ExternalLink,
  RefreshCw,
  Sliders,
  ChevronDown,
  Eye,
  EyeOff,
  Square,
  FileText,
  FileUp,
  Download,
  BookOpen,
  UploadCloud,
  FileCheck,
  AlertCircle,
  ArrowRight,
  Trash2,
  HelpCircle,
  File
} from 'lucide-react';
import { api } from '../services/api';

// Code Block with 1-click Copy
function CodeBlock({ language, value }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-2.5 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 font-mono text-[11px] shadow-lg">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400">
        <span className="uppercase tracking-wider font-semibold text-indigo-400">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-slate-200 leading-relaxed font-mono">
        <code>{value}</code>
      </pre>
    </div>
  );
}

export default function ClaudeChatbot({ activeCourse }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState(null);
  const [displayedContent, setDisplayedContent] = useState({});

  // AI Configuration State (Google Gemini active by default)
  const [provider, setProvider] = useState(() => localStorage.getItem('ai_provider') || 'gemini');
  const [apiKeys, setApiKeys] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('ai_api_keys') || '{}');
      if (!stored.gemini) {
        stored.gemini = import.meta.env.VITE_GEMINI_API_KEY || '';
      }
      return stored;
    } catch {
      return { gemini: import.meta.env.VITE_GEMINI_API_KEY || '' };
    }
  });
  const [showKeyPassword, setShowKeyPassword] = useState(false);
  const [testStatus, setTestStatus] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState(null);

  // Document Study Notes State
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'notes'
  const [docFile, setDocFile] = useState(null);
  const [docCustomTitle, setDocCustomTitle] = useState('');
  const [docLoading, setDocLoading] = useState(false);
  const [docProgressStep, setDocProgressStep] = useState(0);
  const [docError, setDocError] = useState(null);
  const [generatedNotes, setGeneratedNotes] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [notesCopied, setNotesCopied] = useState(false);
  const fileInputRef = useRef(null);
  const docTimerRef = useRef(null);

  // Handle File Selection
  const handleFileSelect = (file) => {
    if (!file) return;
    const allowed = ['.pdf', '.docx', '.doc', '.pptx', '.ppt', '.txt', '.md'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowed.includes(ext)) {
      setDocError(`Unsupported format "${ext}". Please upload PDF, Word (DOCX), PowerPoint (PPTX), or TXT.`);
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setDocError('File exceeds 20MB limit. Please upload a smaller document.');
      return;
    }
    setDocError(null);
    setDocFile(file);
    if (!docCustomTitle) {
      const cleanName = file.name.substring(0, file.name.lastIndexOf('.'));
      setDocCustomTitle(cleanName);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Generate Notes from Document
  const handleGenerateDocNotes = async () => {
    if (!docFile) return;
    setDocLoading(true);
    setDocError(null);
    setDocProgressStep(1);

    if (docTimerRef.current) clearInterval(docTimerRef.current);
    docTimerRef.current = setInterval(() => {
      setDocProgressStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 3500);

    try {
      const activeKey = apiKeys[provider] || '';
      const response = await api.uploadDocForNotes(docFile, docCustomTitle, {
        provider,
        apiKey: activeKey,
        model: provider === 'gemini' ? 'gemini-3.5-flash-lite' : undefined
      });
      clearInterval(docTimerRef.current);
      setDocProgressStep(3);
      setGeneratedNotes(response);
    } catch (err) {
      clearInterval(docTimerRef.current);
      setDocError(err.message || 'Failed to extract and generate notes from document.');
    } finally {
      setDocLoading(false);
    }
  };

  // Copy Generated Notes
  const handleCopyDocNotes = () => {
    if (!generatedNotes?.notes) return;
    navigator.clipboard.writeText(generatedNotes.notes);
    setNotesCopied(true);
    setTimeout(() => setNotesCopied(false), 2000);
  };

  // Download Generated Notes as Markdown
  const handleDownloadDocNotes = () => {
    if (!generatedNotes?.notes) return;
    const blob = new Blob([generatedNotes.notes], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(generatedNotes.title || 'study_notes').replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Switch to chat and ask tutor about these notes
  const handleAskAboutNotes = () => {
    if (!generatedNotes) return;
    setActiveTab('chat');
    const prompt = `I just generated study notes from "${generatedNotes.title}". Could you quiz me on the key concepts or clarify anything confusing?`;
    handleSend(prompt);
  };

  // Reset Document Notes to upload another
  const handleResetDocNotes = () => {
    setDocFile(null);
    setDocCustomTitle('');
    setGeneratedNotes(null);
    setDocError(null);
    setDocProgressStep(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm your **Smart AI Study Mentor**.\n\nI can help you:\n- 💡 **Explain complex concepts** with intuitive real-world analogies\n- 📝 **Break down formulas & code** step-by-step\n- 🎯 **Generate practice quizzes & test questions**\n- ⏱️ **Create customized study schedules** for your exams\n\nAsk me any question below, or select a quick topic!`,
      model: 'Smart AI Tutor',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimerRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, displayedContent, isOpen]);

  // Adjust textarea height automatically
  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  // Streaming / Typing simulation for assistant replies
  const startTypingEffect = (msgId, fullText) => {
    setTypingMessageId(msgId);
    let currentLength = 0;
    const step = Math.max(2, Math.floor(fullText.length / 40));

    if (typingTimerRef.current) clearInterval(typingTimerRef.current);

    typingTimerRef.current = setInterval(() => {
      currentLength += step;
      if (currentLength >= fullText.length) {
        clearInterval(typingTimerRef.current);
        setDisplayedContent((prev) => ({ ...prev, [msgId]: fullText }));
        setTypingMessageId(null);
      } else {
        setDisplayedContent((prev) => ({ ...prev, [msgId]: fullText.slice(0, currentLength) }));
      }
    }, 25);
  };

  const skipTyping = (msgId, fullText) => {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    setDisplayedContent((prev) => ({ ...prev, [msgId]: fullText }));
    setTypingMessageId(null);
  };

  const handleSend = async (customPrompt = null) => {
    const textToSend = customPrompt || input.trim();
    if (!textToSend || loading) return;

    const userMsgId = 'u_' + Date.now();
    const userMessage = {
      id: userMsgId,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    if (!customPrompt) {
      setInput('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
    setLoading(true);

    try {
      const activeKey = apiKeys[provider] || '';
      const response = await api.sendChatMessage(
        newHistory.map((m) => ({ role: m.role, content: m.content })),
        activeCourse?.id,
        {
          provider,
          apiKey: activeKey,
          model: provider === 'gemini' ? 'gemini-3.5-flash-lite' : provider === 'openai' ? 'gpt-4o-mini' : undefined
        }
      );

      const assistantMsgId = 'a_' + Date.now();
      const assistantMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: response.content,
        model: response.model,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantMessage]);
      startTypingEffect(assistantMsgId, response.content);
    } catch (err) {
      const errorMsgId = 'err_' + Date.now();
      const errMessage = {
        id: errorMsgId,
        role: 'assistant',
        content: `⚠️ **Connection Notice:** ${err.message || 'Could not reach AI model.'}\n\nYou can switch to **Free Real AI** in AI Settings (⚙️ icon) or verify your API key.`,
        model: 'System Alert',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errMessage]);
      setDisplayedContent((prev) => ({ ...prev, [errorMsgId]: errMessage.content }));
    } finally {
      setLoading(false);
    }
  };

  // Clear chat history
  const handleResetChat = () => {
    if (window.confirm('Clear conversation and start a new chat?')) {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      setMessages([
        {
          id: 'welcome_new',
          role: 'assistant',
          content: `New chat session started! What topic or course concept would you like to explore?`,
          model: 'Smart AI Tutor',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setDisplayedContent({});
      setTypingMessageId(null);
    }
  };

  // Copy full message
  const handleCopyMessage = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // Test provider API Key
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestStatus(null);
    try {
      const currentKey = apiKeys[provider] || '';
      const res = await api.testAiConnection(provider, currentKey);
      setTestStatus({
        success: true,
        message: res.message || 'Connected successfully!',
        latency: res.latencyMs ? `${res.latencyMs}ms` : null
      });
    } catch (err) {
      setTestStatus({
        success: false,
        message: err.message || 'Connection failed.'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    localStorage.setItem('ai_provider', provider);
    localStorage.setItem('ai_api_keys', JSON.stringify(apiKeys));

    const currentKey = apiKeys[provider];
    if (currentKey) {
      try {
        await api.saveAiKey(provider, currentKey);
      } catch (e) {
        console.warn('Could not persist to server .env:', e.message);
      }
    }
    setShowSettings(false);
    setTestStatus(null);
  };

  const quickPrompts = [
    'Explain Database 3NF Normalization with a clear example',
    'Compare Balanced BST vs Hash Table lookup complexities',
    'Generate a 3-question practice quiz on this subject',
    'How do I implement binary search in Python?',
    'Give me a 2-hour Pomodoro study schedule for exam prep'
  ];

  const providerNames = {
    gemini: 'Google Gemini',
    openai: 'OpenAI ChatGPT',
    claude: 'Anthropic Claude',
    free: 'Free Real AI'
  };

  const providerBadges = {
    gemini: { label: 'Google Gemini 3.5', color: 'from-blue-500 to-cyan-500' },
    openai: { label: 'GPT-4o Mini', color: 'from-emerald-500 to-teal-500' },
    claude: { label: 'Claude 3.5', color: 'from-purple-500 to-indigo-500' },
    free: { label: 'Free Real AI', color: 'from-amber-500 to-orange-500' }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      
      {/* Floating Launch Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md border border-blue-500 transition active:scale-95"
          title="Open Study Assistant"
        >
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-white" />
          </div>
          <span>Study Assistant</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
        </button>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div 
          className={`glass-panel border border-slate-700/80 shadow-2xl rounded-2xl flex flex-col transition-all duration-300 bg-slate-900/95 backdrop-blur-xl ${
            isExpanded 
              ? 'fixed inset-4 sm:inset-10 z-50 rounded-2xl w-auto h-auto' 
              : 'w-[94vw] sm:w-[460px] h-[600px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/70 rounded-t-2xl">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${providerBadges[provider]?.color || 'from-indigo-500 to-purple-500'} flex items-center justify-center text-white shadow-md`}>
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">AI Study Mentor</span>
                  <span className={`text-[10px] font-semibold text-white px-2 py-0.5 rounded-full bg-gradient-to-r ${providerBadges[provider]?.color || 'from-indigo-500 to-purple-500'} shadow-sm`}>
                    {providerBadges[provider]?.label || 'Active'}
                  </span>
                </div>
                {activeCourse ? (
                  <p className="text-[10px] text-slate-400 truncate max-w-[200px]">
                    Context: <span className="text-indigo-300 font-medium">{activeCourse.name}</span>
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500">Universal Academic Tutor</p>
                )}
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-1.5 rounded-lg transition ${
                  showSettings ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="AI Model & Key Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetChat}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Restart Chat"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title={isExpanded ? 'Restore View' : 'Expand Fullscreen'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mode Switcher Tabs (Chat vs Generate Notes) */}
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-800 bg-slate-950/80">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'chat'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>AI Chat Tutor</span>
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all relative ${
                activeTab === 'notes'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Generate Notes</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" /> Doc AI
              </span>
            </button>
          </div>

          {/* AI Settings Modal / Drawer */}
          {showSettings && (
            <div className="p-4 border-b border-slate-700/80 bg-slate-950/90 text-xs text-slate-300 space-y-3.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  Select AI Provider & Model
                </span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Instant Switch
                </span>
              </div>

              {/* Provider Selection Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                {[
                  { id: 'gemini', label: 'Google Gemini', icon: '♊' },
                  { id: 'openai', label: 'ChatGPT', icon: '🤖' },
                  { id: 'claude', label: 'Claude', icon: '🟣' },
                  { id: 'free', label: 'Free Real AI', icon: '⚡' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setProvider(item.id);
                      setTestStatus(null);
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-medium transition text-center flex items-center justify-center gap-1 ${
                      provider === item.id
                        ? 'bg-indigo-600 text-white font-bold shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Provider Details & API Key Entry */}
              {provider === 'free' ? (
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 space-y-2">
                  <p className="font-semibold text-emerald-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> 100% Free Real AI Active (No API Key Required)
                  </p>
                  <p className="text-slate-400 leading-relaxed">
                    Uses free open-source LLM reasoning + encyclopedic academic solver.
                  </p>
                  <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                    <span className="text-indigo-300">💡 Want unlimited live Gemini AI responses?</span>
                    <button
                      onClick={() => setProvider('gemini')}
                      className="px-2 py-0.5 rounded bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600 hover:text-white transition font-medium"
                    >
                      Switch to Gemini (Free) →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <label className="font-medium text-slate-300 flex items-center gap-1">
                      <Key className="w-3 h-3 text-indigo-400" />
                      {providerNames[provider]} API Key:
                    </label>
                    {provider === 'gemini' && (
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[10px] underline"
                      >
                        Get Free Gemini Key <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                    {provider === 'openai' && (
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[10px] underline"
                      >
                        Get OpenAI Key <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                    {provider === 'claude' && (
                      <a
                        href="https://console.anthropic.com/"
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[10px] underline"
                      >
                        Get Claude Key <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type={showKeyPassword ? 'text' : 'password'}
                      placeholder={`Paste your ${providerNames[provider]} API key...`}
                      value={apiKeys[provider] || ''}
                      onChange={(e) =>
                        setApiKeys({ ...apiKeys, [provider]: e.target.value })
                      }
                      className="w-full px-3 py-2 pr-9 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeyPassword(!showKeyPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                    >
                      {showKeyPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {testStatus && (
                    <div
                      className={`p-2 rounded-lg text-[10px] ${
                        testStatus.success
                          ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-950/60 border border-rose-500/30 text-rose-300'
                      }`}
                    >
                      {testStatus.message} {testStatus.latency && `(${testStatus.latency})`}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
                {provider !== 'free' && (
                  <button
                    onClick={handleTestConnection}
                    disabled={testingConnection || !apiKeys[provider]}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition disabled:opacity-40 flex items-center gap-1"
                  >
                    {testingConnection ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                    Test Key
                  </button>
                )}
                <button
                  onClick={handleSaveSettings}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold shadow-md transition"
                >
                  Save & Apply
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 1: AI CHAT TUTOR VIEW */}
          {/* ======================================================== */}
          {activeTab === 'chat' && (
            <>
              {/* Chat Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {messages.map((msg) => {
                  const isAssistant = msg.role === 'assistant';
                  const textContent =
                    typingMessageId === msg.id
                      ? displayedContent[msg.id] || ''
                      : displayedContent[msg.id] !== undefined
                      ? displayedContent[msg.id]
                      : msg.content;

                  return (
                    <div
                      key={msg.id}
                      className={`group flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`relative max-w-[90%] p-3.5 rounded-2xl leading-relaxed text-xs shadow-md transition-all ${
                          isAssistant
                            ? 'bg-slate-900/90 text-slate-200 border border-slate-800/80 rounded-bl-none shadow-black/40'
                            : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-none shadow-indigo-600/20'
                        }`}
                      >
                        {isAssistant ? (
                          <div className="prose prose-invert prose-xs max-w-none space-y-2">
                            <ReactMarkdown
                              components={{
                                code({ node, inline, className, children, ...props }) {
                                  const match = /language-(\w+)/.exec(className || '');
                                  const codeString = String(children).replace(/\n$/, '');
                                  return !inline && (match || codeString.includes('\n')) ? (
                                    <CodeBlock language={match ? match[1] : ''} value={codeString} />
                                  ) : (
                                    <code
                                      className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-[11px] border border-slate-700/50"
                                      {...props}
                                    >
                                      {children}
                                    </code>
                                  );
                                },
                                h1: ({ children }) => <h1 className="text-sm font-bold text-white border-b border-slate-700 pb-1 mt-2 mb-1">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-xs font-bold text-indigo-300 mt-2 mb-1">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-xs font-semibold text-purple-300 mt-2 mb-1">{children}</h3>,
                                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-1.5 pl-1">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-1.5 pl-1">{children}</ol>,
                                li: ({ children }) => <li className="text-slate-200">{children}</li>,
                                blockquote: ({ children }) => (
                                  <blockquote className="border-l-2 border-indigo-500 pl-3 my-2 text-slate-400 italic bg-slate-950/40 py-1 rounded-r">
                                    {children}
                                  </blockquote>
                                ),
                                p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                                strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>
                              }}
                            >
                              {textContent}
                            </ReactMarkdown>

                            {/* Blinking typing cursor */}
                            {typingMessageId === msg.id && (
                              <span className="inline-block w-2 h-3.5 bg-indigo-400 animate-pulse ml-0.5 align-middle rounded-sm" />
                            )}
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                        )}

                        {/* Copy and Actions overlay */}
                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/60 text-[9px] text-slate-400">
                          <div className="flex items-center gap-1.5">
                            {isAssistant && msg.model && (
                              <span className="text-indigo-400 font-medium">{msg.model}</span>
                            )}
                            <span>•</span>
                            <span>{msg.timestamp}</span>
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {typingMessageId === msg.id && (
                              <button
                                onClick={() => skipTyping(msg.id, msg.content)}
                                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[9px]"
                                title="Skip animation"
                              >
                                <Square className="w-2.5 h-2.5 fill-current" /> Skip
                              </button>
                            )}
                            <button
                              onClick={() => handleCopyMessage(msg.id, msg.content)}
                              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                              title="Copy message"
                            >
                              {copiedMsgId === msg.id ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Loading Indicator */}
                {loading && (
                  <div className="flex items-center gap-2.5 p-3 bg-slate-900/90 rounded-2xl w-fit border border-slate-800 text-slate-400 text-xs shadow-md">
                    <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
                    <span>Thinking & synthesizing academic explanation...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompt Suggestions */}
              <div className="px-3 py-1.5 border-t border-slate-800 bg-slate-950/50 overflow-x-auto flex gap-1.5 no-scrollbar">
                <button
                  onClick={() => setActiveTab('notes')}
                  className="whitespace-nowrap px-2.5 py-1 rounded-full bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 text-[10px] border border-indigo-500/40 transition flex items-center gap-1 font-semibold"
                >
                  <FileUp className="w-3 h-3 text-indigo-400" /> Upload Document to Generate Notes
                </button>
                {quickPrompts.map((qp, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(qp)}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[10px] border border-slate-700/60 transition hover:border-indigo-500/50 hover:text-white"
                  >
                    💡 {qp.slice(0, 32)}...
                  </button>
                ))}
              </div>

              {/* Input Footer */}
              <div className="p-3 border-t border-slate-800 bg-slate-950/90 rounded-b-2xl">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-end gap-2"
                >
                  <button
                    type="button"
                    onClick={() => setActiveTab('notes')}
                    className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-indigo-300 border border-slate-700/80 transition flex items-center justify-center shrink-0"
                    title="Upload document to generate notes"
                  >
                    <FileUp className="w-4 h-4" />
                  </button>
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    placeholder="Ask doubt, concept explanation, or code breakdown (Enter to send)..."
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition resize-none max-h-32 leading-relaxed"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white disabled:opacity-40 transition shadow-lg shadow-indigo-600/30 flex items-center justify-center shrink-0"
                    title="Send Message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          )}

          {/* ======================================================== */}
          {/* TAB 2: GENERATE NOTES FROM DOCUMENT VIEW */}
          {/* ======================================================== */}
          {activeTab === 'notes' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-900/40">
              
              {/* STATE A: Generated Notes View */}
              {generatedNotes ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Generated Notes Top Banner */}
                  <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-2 shrink-0">
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">{generatedNotes.title}</span>
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                        <span className="px-1.5 py-0.2 rounded bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 font-medium">
                          {generatedNotes.fileType}
                        </span>
                        {generatedNotes.pages && <span>• {generatedNotes.pages} pages</span>}
                        <span>• {generatedNotes.fileSizeKb} KB</span>
                        <span className="text-emerald-400">• Gemini AI</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={handleCopyDocNotes}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition border border-slate-700"
                        title="Copy all notes"
                      >
                        {notesCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{notesCopied ? 'Copied!' : 'Copy'}</span>
                      </button>
                      <button
                        onClick={handleDownloadDocNotes}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition border border-slate-700"
                        title="Download Markdown (.md)"
                      >
                        <Download className="w-3 h-3 text-indigo-400" />
                        <span>Export</span>
                      </button>
                      <button
                        onClick={handleResetDocNotes}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        title="Upload a different document"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Generated Notes Markdown */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
                    <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 shadow-inner prose prose-invert prose-xs max-w-none">
                      <ReactMarkdown
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            const codeString = String(children).replace(/\n$/, '');
                            return !inline && (match || codeString.includes('\n')) ? (
                              <CodeBlock language={match ? match[1] : ''} value={codeString} />
                            ) : (
                              <code
                                className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-[11px] border border-slate-700/50"
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          },
                          h1: ({ children }) => (
                            <h1 className="text-base font-extrabold text-white border-b border-indigo-500/40 pb-2 mt-2 mb-3 bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-xs font-bold text-indigo-300 mt-4 mb-2 flex items-center gap-1.5 bg-slate-900/90 p-2.5 rounded-xl border border-indigo-500/20">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-xs font-semibold text-purple-300 mt-3 mb-1.5">{children}</h3>
                          ),
                          ul: ({ children }) => <ul className="list-disc list-inside space-y-1.5 my-2 pl-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1.5 my-2 pl-1">{children}</ol>,
                          li: ({ children }) => <li className="text-slate-200 leading-relaxed">{children}</li>,
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-2 border-indigo-500 pl-3 my-2 text-slate-300 italic bg-slate-950/40 py-1.5 rounded-r">
                              {children}
                            </blockquote>
                          ),
                          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-slate-300">{children}</p>,
                          strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>
                        }}
                      >
                        {generatedNotes.notes}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="p-3 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between gap-2">
                    <button
                      onClick={handleResetDocNotes}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition border border-slate-700"
                    >
                      ← Upload Another
                    </button>
                    <button
                      onClick={handleAskAboutNotes}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>Quiz Me on These Notes</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : docLoading ? (
                /* STATE B: Processing Animation & Step Tracker */
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 animate-spin blur-md opacity-60" />
                    <div className="absolute inset-1 rounded-full bg-slate-900 flex items-center justify-center border border-indigo-500/50">
                      <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">Synthesizing Academic Study Notes</h3>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      Google Gemini is extracting structure, key definitions, and flashcards from your document...
                    </p>
                  </div>

                  <div className="w-full max-w-xs space-y-2.5 text-left bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-2.5 text-xs">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        docProgressStep >= 1 ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {docProgressStep > 1 ? '✓' : '1'}
                      </span>
                      <span className={docProgressStep >= 1 ? 'text-slate-200 font-medium' : 'text-slate-500'}>
                        Reading & parsing document structure
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        docProgressStep >= 2 ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {docProgressStep > 2 ? '✓' : '2'}
                      </span>
                      <span className={docProgressStep >= 2 ? 'text-slate-200 font-medium' : 'text-slate-500'}>
                        Extracting key definitions & formulas
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        docProgressStep >= 3 ? 'bg-indigo-500 text-white animate-pulse' : 'bg-slate-800 text-slate-400'
                      }`}>
                        3
                      </span>
                      <span className={docProgressStep >= 3 ? 'text-indigo-300 font-semibold' : 'text-slate-500'}>
                        Generating summary, highlights & flashcards
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* STATE C: Upload Form */
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Informative Sub-header */}
                  <div className="text-center space-y-1 py-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/70 border border-indigo-500/30 text-indigo-300 text-[11px] font-semibold mb-1">
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      Document Study Notes Generator
                    </div>
                    <h3 className="text-sm font-bold text-white">Upload Any Document to Generate Notes</h3>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      Upload PDF slides, Word documents, PowerPoint presentations, or text files. The AI extracts concepts, definitions, and creates revision flashcards.
                    </p>
                  </div>

                  {/* Drag & Drop Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 flex flex-col items-center justify-center text-center transition-all ${
                      isDragging
                        ? 'border-indigo-400 bg-indigo-950/40 scale-[1.01]'
                        : docFile
                        ? 'border-emerald-500/60 bg-emerald-950/20'
                        : 'border-slate-700/80 hover:border-indigo-500/60 bg-slate-950/40 hover:bg-slate-950/70'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.md"
                      onChange={(e) => handleFileSelect(e.target.files?.[0])}
                      className="hidden"
                    />

                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-lg ${
                      docFile
                        ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-400'
                        : 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-400'
                    }`}>
                      {docFile ? <FileCheck className="w-6 h-6" /> : <UploadCloud className="w-6 h-6" />}
                    </div>

                    <p className="text-xs font-semibold text-white mb-1">
                      {docFile ? docFile.name : 'Choose a document or drag & drop'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {docFile
                        ? `${(docFile.size / 1024).toFixed(1)} KB • Click to choose a different file`
                        : 'Supports PDF, Word (DOCX), PowerPoint (PPTX), and TXT up to 20MB'}
                    </p>

                    {/* Supported Format Badges */}
                    <div className="flex flex-wrap justify-center items-center gap-1.5 mt-3">
                      {[
                        { label: 'PDF', color: 'bg-rose-950/70 text-rose-300 border-rose-500/30' },
                        { label: 'Word (.docx)', color: 'bg-blue-950/70 text-blue-300 border-blue-500/30' },
                        { label: 'PPT (.pptx)', color: 'bg-amber-950/70 text-amber-300 border-amber-500/30' },
                        { label: 'Text (.txt / .md)', color: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/30' }
                      ].map((f) => (
                        <span
                          key={f.label}
                          className={`text-[9px] font-semibold px-2 py-0.5 rounded-md border ${f.color}`}
                        >
                          {f.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Selected File Card & Configuration */}
                  {docFile && (
                    <div className="space-y-3 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span className="text-xs text-white font-medium truncate">{docFile.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResetDocNotes();
                          }}
                          className="text-slate-500 hover:text-rose-400 p-1"
                          title="Remove file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-1">
                          Note Title / Subject (Optional)
                        </label>
                        <input
                          type="text"
                          value={docCustomTitle}
                          onChange={(e) => setDocCustomTitle(e.target.value)}
                          placeholder="e.g. Chapter 4: Relational Algebra & SQL"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <button
                        onClick={handleGenerateDocNotes}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Generate AI Study Notes</span>
                      </button>
                    </div>
                  )}

                  {/* Error Alert */}
                  {docError && (
                    <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-semibold">Generation Notice</p>
                        <p className="text-[11px] text-rose-200">{docError}</p>
                      </div>
                    </div>
                  )}

                  {/* Feature Highlights Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] text-slate-400">
                    <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-0.5">
                      <span className="font-semibold text-slate-200 flex items-center gap-1">
                        📋 Executive Summary
                      </span>
                      <p className="text-slate-400">Crisp multi-paragraph brief summarizing the core topics.</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-0.5">
                      <span className="font-semibold text-slate-200 flex items-center gap-1">
                        🔑 Key Concepts & Terms
                      </span>
                      <p className="text-slate-400">Formulas, equations, and vocabulary explained clearly.</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-0.5">
                      <span className="font-semibold text-slate-200 flex items-center gap-1">
                        💡 Highlights & Exam Tips
                      </span>
                      <p className="text-slate-400">Must-know points and common test pitfalls.</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-0.5">
                      <span className="font-semibold text-slate-200 flex items-center gap-1">
                        🧠 Revision Flashcards
                      </span>
                      <p className="text-slate-400">High-yield Q&A pairs for rapid self-assessment.</p>
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

        </div>
      )}

    </div>
  );
}
