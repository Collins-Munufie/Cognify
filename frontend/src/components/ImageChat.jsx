import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, Image as ImageIcon, Send, Trash2, Plus, 
  Brain, FileText, Sparkles, X, Loader2, Maximize2, 
  ChevronRight, ArrowRight, MessageSquare, Compass, Play,
  ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Logo from './Logo';
import api, { getErrorMessage } from '../lib/api';

export default function ImageChat() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  
  // Setup / Upload states
  const [images, setImages] = useState([]); // List of base64 data URLs
  const [question, setQuestion] = useState('');
  
  // UI / Status states
  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [followupText, setFollowupText] = useState('');
  const [zoomedImage, setZoomedImage] = useState(null);
  const [error, setError] = useState('');
  
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Quick Chips
  const promptChips = [
    { label: "Explain this diagram", text: "Explain this diagram and its core components in detail." },
    { label: "Summarize this flowchart", text: "Walk me through this flowchart step-by-step, detailing the decisions and processes." },
    { label: "Solve/Explain equation", text: "Explain the formulas or mathematical equations shown here, and show how to solve them step-by-step." },
    { label: "Create flashcards", text: "Based on this image, extract the key terms and generate 5 flashcards (Question & Answer format)." },
    { label: "Generate quiz", text: "Create 3 multiple choice questions (MCQs) with correct answers based on this visual material." },
    { label: "Simplify for a beginner", text: "Explain the concepts in this image in very simple terms, as if you were explaining to a beginner." }
  ];

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeSession?.messages, loading]);

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const response = await api.get('/api/image-chats/sessions');
      setSessions(response.data);
    } catch (err) {
      console.error("Failed to load image sessions:", err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadSession = async (sessionId) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/api/image-chats/session/${sessionId}`);
      setActiveSession(response.data);
      // Reset setup states
      setImages([]);
      setQuestion('');
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load session."));
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this chat session?")) return;
    
    try {
      await api.delete(`/api/image-chats/session/${sessionId}`);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSession?.id === sessionId) {
        setActiveSession(null);
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  const startNewChat = () => {
    setActiveSession(null);
    setImages([]);
    setQuestion('');
    setError('');
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setError('');
    const validImages = files.filter(f => f.type.startsWith('image/'));
    if (validImages.length !== files.length) {
      setError("Please upload images only.");
    }

    const base64Promises = validImages.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    });

    const base64Images = await Promise.all(base64Promises);
    setImages(prev => [...prev, ...base64Images]);
    
    // Clear input value so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (idxToRemove) => {
    setImages(prev => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const submitInitialChat = async () => {
    if (!images.length) {
      setError("Please upload at least one image.");
      return;
    }
    if (!question.trim()) {
      setError("Please enter a question or choose a prompt chip.");
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await api.post('/api/image-chats/session', {
        images,
        initial_question: question
      }, { longRunning: true });

      setActiveSession(response.data);
      fetchSessions(); // Refresh list
    } catch (err) {
      setError(getErrorMessage(err, "Failed to analyze image. Ensure your AI keys are active."));
    } finally {
      setLoading(false);
    }
  };

  const submitFollowupMessage = async (e) => {
    e.preventDefault();
    if (!followupText.trim() || loading || !activeSession) return;

    const query = followupText.trim();
    setFollowupText('');
    setLoading(true);
    setError('');

    // Append user message locally for immediate UI update
    const tempUserMsg = {
      id: Date.now(),
      text: query,
      sender: "user",
      timestamp: new Date().toISOString()
    };
    
    setActiveSession(prev => ({
      ...prev,
      messages: [...prev.messages, tempUserMsg]
    }));

    try {
      const response = await api.post(`/api/image-chats/session/${activeSession.id}/message`, {
        text: query
      }, { longRunning: true });

      // Append AI response
      setActiveSession(prev => ({
        ...prev,
        messages: [...prev.messages, response.data]
      }));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to send message."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text relative pb-32 overflow-hidden flex flex-col">
      {/* Ambient background glows */}
      <div className="absolute top-[10%] left-[-15%] w-[600px] h-[600px] bg-brand-primary/5 rounded-full blur-[130px] pointer-events-none"></div>
      <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* HEADER / NAVBAR */}
      <header className="sticky top-0 z-50 bg-brand-surface/80 backdrop-blur-md border-b border-brand-border">
         <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-brand-surface border border-brand-border rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                title="Back to Dashboard"
              >
                <ChevronLeft className="w-5 h-5 text-brand-muted" />
              </button>
              <Logo size="small" />
            </div>
            <span className="hidden sm:inline font-extrabold text-sm text-brand-muted uppercase tracking-wider">Visual AI Companion</span>
         </div>
      </header>

      {/* MAIN COMPONENT LAYOUT */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full relative z-10 flex flex-col lg:flex-row gap-6 items-stretch h-[calc(100vh-8rem)]">
      
      {/* LEFT COLUMN: History Sidebar (Collapsible/Static) */}
      <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4 bg-brand-surface border border-brand-border rounded-3xl p-4 max-h-[30vh] lg:max-h-full overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-brand-border">
          <span className="font-extrabold text-brand-text text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-brand-primary" /> Image History
          </span>
          <button
            onClick={startNewChat}
            className="p-1.5 rounded-lg border border-brand-border bg-brand-bg hover:bg-brand-surface text-brand-primary font-bold text-xs transition-all flex items-center gap-1 active:scale-95"
            title="Start New Chat"
          >
            <Plus className="w-3.5 h-3.5" /> New
          </button>
        </div>

        {loadingSessions ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 text-brand-muted animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center text-xs text-brand-muted py-8 italic">
            No past image chats.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-full custom-scrollbar pr-1">
            {sessions.map((s) => {
              const isActive = activeSession?.id === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => loadSession(s.id)}
                  className={`w-full p-3 rounded-xl border text-left flex items-start justify-between gap-2 group transition-all relative ${
                    isActive 
                      ? 'border-brand-primary/30 bg-brand-primary/5 text-brand-primary font-bold' 
                      : 'border-brand-border bg-brand-surface hover:bg-brand-bg text-brand-text'
                  }`}
                >
                  <div className="flex flex-col gap-0.5 truncate flex-1 pr-4">
                    <span className="text-xs font-semibold truncate leading-snug">{s.title}</span>
                    <span className="text-[10px] text-brand-muted">
                      {new Date(s.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={(e) => deleteSession(e, s.id)}
                    className="p-1 rounded-lg hover:bg-red-500/10 text-brand-muted hover:text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all active:scale-95 shrink-0"
                    title="Delete Chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Chat Area */}
      <div className="flex-1 flex flex-col bg-brand-surface border border-brand-border rounded-3xl overflow-hidden relative min-h-[50vh] lg:min-h-0">
        
        {error && (
          <div className="p-3 bg-red-500/10 border-b border-red-500/20 text-xs font-semibold text-red-600 flex items-center justify-between gap-4 z-10">
            <span>{error}</span>
            <button onClick={() => setError('')} className="p-1 hover:bg-red-500/10 rounded-lg">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* SETUP PHASE (Upload & Prompt Chip Configuration) */}
        {!activeSession ? (
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 flex flex-col gap-8 custom-scrollbar">
            
            {/* Header */}
            <div className="flex flex-col gap-2 text-center max-w-xl mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center mx-auto mb-2">
                <Brain className="w-6 h-6 animate-pulse" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-brand-text">Ask About Images</h2>
              <p className="text-xs sm:text-sm text-brand-muted leading-relaxed">
                Upload educational charts, handwritten notes, flowcharts, or diagrams, and start an interactive learning session with your AI tutor.
              </p>
            </div>

            {/* Dropzone Upload */}
            <div className="max-w-2xl mx-auto w-full">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-brand-border hover:border-brand-primary/40 bg-brand-bg/50 hover:bg-brand-bg rounded-3xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300 group"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  multiple 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                <div className="p-4 bg-brand-surface border border-brand-border rounded-2xl text-brand-muted group-hover:text-brand-primary group-hover:border-brand-primary/20 transition-all flex items-center justify-center shadow-sm">
                  <Upload className="w-6 h-6 group-hover:scale-110 transition-all duration-300" />
                </div>
                <div className="text-center">
                  <span className="font-extrabold text-brand-text text-sm block">Upload images</span>
                  <span className="text-[10px] text-brand-muted block mt-1">PNG, JPG, JPEG, or WEBP (Multiple allowed)</span>
                </div>
              </div>

              {/* Uploaded Previews */}
              {images.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-3 items-center">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-2xl border border-brand-border overflow-hidden bg-brand-bg group">
                      <img src={img} alt="Upload preview" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-500 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-all active:scale-90 shadow-sm"
                        title="Remove Image"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Prompt Chips */}
            <div className="max-w-3xl mx-auto w-full flex flex-col gap-2">
              <span className="text-xs font-bold text-brand-muted uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" /> Or choose an action:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {promptChips.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setQuestion(chip.text);
                      setError('');
                    }}
                    className="p-3 rounded-2xl border border-brand-border bg-brand-surface hover:bg-brand-bg text-left transition-all hover:border-brand-primary/20 active:scale-98 flex items-center justify-between group"
                  >
                    <span className="text-xs font-semibold text-brand-text pr-2">{chip.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-brand-muted group-hover:text-brand-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Initial Question Textarea */}
            <div className="max-w-3xl mx-auto w-full flex flex-col gap-3 mt-4 border-t border-brand-border pt-6">
              <div className="relative flex flex-col gap-2">
                <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Your Question / Prompt</label>
                <textarea
                  rows={4}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Type your question about the uploaded image(s) here..."
                  className="w-full p-4 rounded-2xl border border-brand-border bg-brand-surface text-brand-text text-sm focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary resize-none custom-scrollbar shadow-sm"
                ></textarea>
              </div>

              <button
                onClick={submitInitialChat}
                disabled={loading || !images.length || !question.trim()}
                className="py-4 px-6 rounded-2xl bg-brand-primary hover:bg-brand-primary-hover disabled:opacity-30 disabled:cursor-not-allowed text-white font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-md active:scale-98 max-w-sm ml-auto w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing Visuals...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" />
                    Start AI Analysis Session
                  </>
                )}
              </button>
            </div>

          </div>
        ) : (
          
          /* CHAT ACTIVE PHASE (Split Screen Dashboard) */
          <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
            
            {/* Left Pane: Image Visualizer (50%) */}
            <div className="w-full lg:w-1/2 flex flex-col border-b lg:border-b-0 lg:border-r border-brand-border bg-brand-bg/30 p-4 max-h-[35vh] lg:max-h-full overflow-y-auto">
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-brand-border">
                <ImageIcon className="w-4 h-4 text-brand-primary" />
                <span className="font-extrabold text-brand-text text-xs uppercase tracking-wider">Uploaded Visual Content</span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3">
                {activeSession.images?.map((img, idx) => (
                  <div key={idx} className="relative aspect-[4/3] rounded-2xl border border-brand-border overflow-hidden bg-brand-surface group shadow-sm">
                    <img src={img} alt="Visual content" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                      <button 
                        onClick={() => setZoomedImage(img)}
                        className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-white transition-all active:scale-90"
                        title="Zoom Image"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Pane: Conversation Feed (50%) */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-brand-surface">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 custom-scrollbar">
                {activeSession.messages?.map((msg) => {
                  const isAI = msg.sender === 'ai';
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex ${isAI ? 'justify-start' : 'justify-end'} max-w-[85%] ${isAI ? 'mr-auto' : 'ml-auto'}`}
                    >
                      <div className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                        isAI 
                          ? 'bg-brand-surface border border-brand-border text-brand-text shadow-sm rounded-bl-sm' 
                          : 'bg-brand-primary text-white shadow-sm rounded-br-sm font-medium'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })}

                {loading && (
                  <div className="flex justify-start">
                    <div className="px-4 py-3 bg-brand-surface border border-brand-border rounded-2xl rounded-bl-sm flex items-center gap-2 text-brand-primary">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs font-bold">AI Companion is thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Box */}
              <form 
                onSubmit={submitFollowupMessage}
                className="p-4 border-t border-brand-border bg-brand-bg flex items-center gap-3"
              >
                <input 
                  type="text" 
                  value={followupText}
                  onChange={(e) => setFollowupText(e.target.value)}
                  disabled={loading}
                  placeholder="Ask a follow-up question..."
                  className="flex-1 py-3 px-4 rounded-xl border border-brand-border bg-brand-surface text-brand-text text-sm focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary shadow-inner"
                />
                <button
                  type="submit"
                  disabled={loading || !followupText.trim()}
                  className="p-3 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-md flex items-center justify-center shrink-0 active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

            </div>

          </div>
        )}

      </div>

      {/* FULL-SCREEN ZOOM OVERLAY MODAL */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomedImage(null)}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-zoom-out"
          >
            <button 
              onClick={() => setZoomedImage(null)}
              className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-xl transition-all"
            >
              <X className="w-6 h-6" />
            </button>
            <motion.img 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={zoomedImage} 
              alt="Zoomed visual content" 
              className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl" 
            />
          </motion.div>
        )}
      </AnimatePresence>

      </main>
    </div>
  );
}
