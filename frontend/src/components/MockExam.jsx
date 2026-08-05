import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, Flag, ChevronLeft, ChevronRight, AlertTriangle, 
  CheckCircle2, XCircle, Info, RefreshCw, Award, BookOpen, 
  Brain, ArrowRight, Sparkles, Sliders, History, Play
} from "lucide-react";
import api, { getErrorMessage } from "../lib/api";

export default function MockExam({ setId, flashcardSet, onSwitchMode }) {
  // Exam phases: 'setup' | 'generating' | 'exam' | 'results' | 'history'
  const [phase, setPhase] = useState("setup");
  const [difficulty, setDifficulty] = useState("Medium");
  const [timeLimit, setTimeLimit] = useState(60); // minutes
  
  // Active Exam States
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  
  // Timer States
  const [timeLeft, setTimeLeft] = useState(0); // seconds
  const [timeTaken, setTimeTaken] = useState(0);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  // Submitting & Loading States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);

  // Attempt History State
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Results Review State
  const [resultsFilter, setResultsFilter] = useState("all"); // 'all' | 'incorrect' | 'flagged'

  // Fetch previous attempts on mount
  useEffect(() => {
    fetchHistory();
  }, [setId]);

  // Timer Effect
  useEffect(() => {
    if (phase === "exam" && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, timeLeft]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await api.get(`/api/mock-exams/history/${setId}`);
      setHistoryList(response.data);
    } catch (err) {
      console.error("Failed to fetch exam history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const startExamGeneration = async () => {
    setPhase("generating");
    setError("");
    try {
      const response = await api.post("/api/mock-exams/generate", {
        set_id: parseInt(setId),
        difficulty,
        time_limit: timeLimit
      }, { longRunning: true });
      
      const examData = response.data;
      setExam(examData);
      setQuestions(examData.questions);
      setUserAnswers({});
      setFlagged({});
      setCurrentIdx(0);
      setTimeLeft(timeLimit * 60);
      setTimeTaken(0);
      startTimeRef.current = Date.now();
      setPhase("exam");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to generate mock exam. Please try again."));
      setPhase("setup");
    }
  };

  const handleOptionSelect = (questionId, option) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };

  const handleTextChange = (questionId, text) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: text
    }));
  };

  const toggleFlag = (idx) => {
    setFlagged(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAutoSubmit = () => {
    console.log("Timer expired. Submitting mock exam automatically.");
    submitExam(true);
  };

  const submitExam = async (isAuto = false) => {
    setSubmitConfirmOpen(false);
    setLoading(true);
    setError("");

    // Calculate time taken
    const elapsedSeconds = startTimeRef.current 
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : timeLimit * 60 - timeLeft;

    try {
      const response = await api.post(`/api/mock-exams/${exam.id}/submit`, {
        user_answers: userAnswers,
        time_taken: elapsedSeconds
      }, { longRunning: true });

      setExam(response.data);
      setPhase("results");
      fetchHistory(); // Refresh attempt list
    } catch (err) {
      setError(getErrorMessage(err, "Failed to submit and grade exam."));
    } finally {
      setLoading(false);
    }
  };

  const loadPastAttempt = async (attemptId) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/api/mock-exams/${attemptId}`);
      setExam(response.data);
      setPhase("results");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load past attempt details."));
    } finally {
      setLoading(false);
    }
  };

  const handleTutorWeakTopics = () => {
    if (!exam || !exam.analysis) return;
    const weakTopicsStr = exam.analysis.weak_topics?.join(", ") || "the weak areas in my mock exam";
    const promptMessage = `Hi! I just finished a mock exam on "${flashcardSet?.title || "this set"}" and got a score of ${exam.score}/30 (${exam.percentage}%). I struggled with these specific topics: ${weakTopicsStr}. Can you walk me through these concepts step-by-step and help me understand them?`;
    
    // Switch to tutor chat mode and inject query
    if (onSwitchMode) {
      onSwitchMode("chat", promptMessage);
    }
  };

  // Helper to count answered questions
  const answeredCount = Object.keys(userAnswers).filter(k => {
    const val = userAnswers[k];
    return val !== undefined && val !== null && val.toString().trim() !== "";
  }).length;
  const unansweredCount = questions.length - answeredCount;
  const flaggedCount = Object.keys(flagged).filter(k => flagged[k]).length;

  if (phase === "generating") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[60vh]">
        <div className="relative w-24 h-24 mb-6">
          <div className="absolute inset-0 border-4 border-brand-primary/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Brain className="w-10 h-10 text-brand-primary animate-pulse" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-brand-text mb-2 animate-pulse">Cognify AI is building your exam...</h2>
        <p className="text-brand-muted text-center max-w-md">
          Analyzing study material, formulating balanced questions, and configuring difficulty levels. This takes about 10-15 seconds.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen pb-12">
      {error && (
        <div className="mx-4 mt-4 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-sm">Error Occurred</h4>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* SETUP PHASE */}
      {phase === "setup" && (
        <div className="max-w-3xl mx-auto w-full px-4 pt-6">
          <div className="glass-panel p-6 sm:p-8 flex flex-col gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
            
            <div className="flex items-center gap-3">
              <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-2xl">
                <Award className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-brand-text">AI Mock Exam</h1>
                <p className="text-sm text-brand-muted mt-0.5">Simulate a university examination using this study set</p>
              </div>
            </div>

            <hr className="border-brand-border" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Config */}
              <div className="flex flex-col gap-5">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-brand-muted mb-2 block">
                    Choose Difficulty Level
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {["Easy", "Medium", "Hard", "Exam Level"].map((level) => (
                      <button
                        key={level}
                        onClick={() => setDifficulty(level)}
                        className={`p-3 rounded-xl border font-bold text-sm flex flex-col items-start gap-1 transition-all ${
                          difficulty === level 
                            ? "border-brand-primary bg-brand-primary/5 text-brand-primary" 
                            : "border-brand-border bg-brand-surface hover:border-brand-muted/40 text-brand-text"
                        }`}
                      >
                        <span className="text-sm font-bold">{level}</span>
                        <span className="text-[10px] font-normal text-brand-muted">
                          {level === "Easy" && "Core facts & definitions"}
                          {level === "Medium" && "Process & comprehension"}
                          {level === "Hard" && "Multi-step analytical Qs"}
                          {level === "Exam Level" && "Rigorous university style"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-brand-muted mb-2 block">
                    Choose Time Limit
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[30, 60, 90, 120].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => setTimeLimit(mins)}
                        className={`py-2 px-3 rounded-xl border font-bold text-sm transition-all text-center ${
                          timeLimit === mins
                            ? "border-brand-primary bg-brand-primary/5 text-brand-primary"
                            : "border-brand-border bg-brand-surface hover:border-brand-muted/40 text-brand-text"
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Instructions / Attempt Info */}
              <div className="p-5 rounded-2xl bg-brand-bg border border-brand-border flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-3">
                  <h3 className="font-bold text-brand-text text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-primary" />
                    Exam Specifications
                  </h3>
                  <ul className="text-xs text-brand-muted flex flex-col gap-2 list-disc list-inside">
                    <li>Exactly **30 questions** total</li>
                    <li>Balanced mix of Multiple Choice, True/False, Fill-in-the-Blank, and Short Written Answers</li>
                    <li>Distraction-free environment: answers are locked until submission</li>
                    <li>Auto-submit on timer expiration</li>
                    <li>Grading instantly with full AI strength/weakness diagnostics</li>
                  </ul>
                </div>

                <button
                  onClick={startExamGeneration}
                  className="w-full py-4 px-6 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Start Mock Exam
                </button>
              </div>
            </div>

            {/* History Section */}
            {historyList.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-bold text-brand-text mb-3 flex items-center gap-2">
                  <History className="w-4 h-4 text-brand-muted" />
                  Your Previous Attempts
                </h3>
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                  {historyList.map((attempt) => (
                    <div
                      key={attempt.id}
                      onClick={() => loadPastAttempt(attempt.id)}
                      className="p-4 rounded-xl border border-brand-border bg-brand-surface hover:bg-brand-bg transition-all flex justify-between items-center cursor-pointer"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-brand-text text-sm">{attempt.difficulty} Attempt</span>
                        <span className="text-xs text-brand-muted">
                          {new Date(attempt.created_at).toLocaleDateString()} at {new Date(attempt.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right flex flex-col gap-0.5">
                          <span className="font-bold text-brand-text text-sm">{attempt.score}/30</span>
                          <span className="text-xs font-semibold text-brand-primary">{attempt.percentage}%</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-brand-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EXAM ENVIRONMENT (DISTRACTION-FREE) */}
      {phase === "exam" && (
        <div className="flex-1 flex flex-col gap-6 max-w-6xl mx-auto w-full px-4 pt-4">
          {/* Header Bar */}
          <div className="glass-panel p-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-14 md:top-4 z-10">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold bg-brand-primary/10 text-brand-primary px-2.5 py-1 rounded-full uppercase">
                {difficulty}
              </span>
              <h2 className="font-bold text-brand-text text-sm sm:text-base line-clamp-1 max-w-[200px] sm:max-w-md">
                {exam.title}
              </h2>
            </div>

            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-bg border border-brand-border">
                <Clock className={`w-4 h-4 ${timeLeft < 300 ? "text-red-500 animate-pulse" : "text-brand-muted"}`} />
                <span className={`font-mono font-bold text-sm ${timeLeft < 300 ? "text-red-500 animate-pulse" : "text-brand-text"}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>

              <button
                onClick={() => setSubmitConfirmOpen(true)}
                className="py-2.5 px-5 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold rounded-xl text-sm transition-all shadow-sm"
              >
                Submit Exam
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left: Question Card (2/3 width) */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="glass-panel p-6 sm:p-8 min-h-[40vh] flex flex-col justify-between gap-6 relative">
                {/* Top: Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-brand-muted uppercase tracking-wider">
                      Question {currentIdx + 1} of {questions.length}
                    </span>
                    <span className="text-[10px] font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full w-max">
                      {questions[currentIdx]?.type === "mcq" && "Multiple Choice"}
                      {questions[currentIdx]?.type === "true_false" && "True / False"}
                      {questions[currentIdx]?.type === "fill_blank" && "Fill-in-the-Blank"}
                      {questions[currentIdx]?.type === "short_answer" && "Short Answer"}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => toggleFlag(currentIdx)}
                    className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${
                      flagged[currentIdx]
                        ? "bg-orange-500/10 border-orange-500 text-orange-500"
                        : "bg-brand-surface border-brand-border text-brand-muted hover:text-brand-text"
                    }`}
                    aria-label="Flag Question for Review"
                  >
                    <Flag className={`w-5 h-5 ${flagged[currentIdx] ? "fill-current" : ""}`} />
                  </button>
                </div>

                {/* Middle: Content */}
                <div className="flex-1 flex flex-col justify-center">
                  <h3 className="text-base sm:text-lg font-bold text-brand-text leading-relaxed">
                    {questions[currentIdx]?.type === "fill_blank" 
                      ? questions[currentIdx]?.sentence 
                      : (questions[currentIdx]?.question || questions[currentIdx]?.statement)}
                  </h3>

                  {/* Input Formats */}
                  <div className="mt-6">
                    {/* MCQ Options */}
                    {questions[currentIdx]?.type === "mcq" && (
                      <div className="flex flex-col gap-3">
                        {questions[currentIdx]?.options.map((opt, oIdx) => {
                          const isSelected = userAnswers[questions[currentIdx].id] === opt;
                          return (
                            <button
                              key={oIdx}
                              onClick={() => handleOptionSelect(questions[currentIdx].id, opt)}
                              className={`w-full p-4 rounded-xl border text-left font-semibold text-sm transition-all duration-200 flex items-center justify-between ${
                                isSelected
                                  ? "border-brand-primary bg-brand-primary/5 text-brand-primary ring-1 ring-brand-primary"
                                  : "border-brand-border bg-brand-surface hover:bg-brand-bg text-brand-text"
                              }`}
                            >
                              <span>{opt}</span>
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected ? "border-brand-primary bg-brand-primary text-white" : "border-brand-border"
                              }`}>
                                {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* True/False Buttons */}
                    {questions[currentIdx]?.type === "true_false" && (
                      <div className="grid grid-cols-2 gap-4">
                        {[true, false].map((val) => {
                          const isSelected = userAnswers[questions[currentIdx].id] === val;
                          return (
                            <button
                              key={val ? "true" : "false"}
                              onClick={() => handleOptionSelect(questions[currentIdx].id, val)}
                              className={`py-5 px-6 rounded-xl border font-bold text-center transition-all ${
                                isSelected
                                  ? "border-brand-primary bg-brand-primary/5 text-brand-primary ring-1 ring-brand-primary"
                                  : "border-brand-border bg-brand-surface hover:bg-brand-bg text-brand-text"
                              }`}
                            >
                              {val ? "TRUE" : "FALSE"}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Fill in the Blank Input */}
                    {questions[currentIdx]?.type === "fill_blank" && (
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-brand-muted uppercase">Your Answer</label>
                        <input
                          type="text"
                          value={userAnswers[questions[currentIdx].id] || ""}
                          onChange={(e) => handleTextChange(questions[currentIdx].id, e.target.value)}
                          placeholder="Type the blank word here..."
                          className="w-full p-4 rounded-xl border border-brand-border bg-brand-surface text-brand-text font-bold text-sm focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                        />
                      </div>
                    )}

                    {/* Short Answer Textarea */}
                    {questions[currentIdx]?.type === "short_answer" && (
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-brand-muted uppercase">Your Detailed Explanation</label>
                        <textarea
                          rows={6}
                          value={userAnswers[questions[currentIdx].id] || ""}
                          onChange={(e) => handleTextChange(questions[currentIdx].id, e.target.value)}
                          placeholder="Write your answer in detail. Aim for completeness..."
                          className="w-full p-4 rounded-xl border border-brand-border bg-brand-surface text-brand-text text-sm focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary resize-none"
                        ></textarea>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom navigation within card */}
                <div className="flex items-center justify-between border-t border-brand-border pt-4">
                  <button
                    onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                    disabled={currentIdx === 0}
                    className="flex items-center gap-1.5 py-2.5 px-4 font-bold text-sm text-brand-muted hover:text-brand-text disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>

                  <button
                    onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
                    disabled={currentIdx === questions.length - 1}
                    className="flex items-center gap-1.5 py-2.5 px-4 font-bold text-sm text-brand-primary hover:text-brand-primary-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Question Navigation Panel (1/3 width) */}
            <div className="lg:col-span-1 glass-panel p-5 flex flex-col gap-5">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-brand-text text-sm">Exam Progress</h3>
                <span className="text-xs font-bold text-brand-muted">
                  {answeredCount}/{questions.length} Answered
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-brand-bg rounded-full h-2 overflow-hidden border border-brand-border">
                <div 
                  className="bg-brand-primary h-full transition-all duration-300"
                  style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                ></div>
              </div>

              {/* Question list grid */}
              <div className="grid grid-cols-5 gap-2 max-h-60 sm:max-h-80 overflow-y-auto pr-1">
                {questions.map((q, idx) => {
                  const hasAnswer = userAnswers[q.id] !== undefined && userAnswers[q.id] !== null && userAnswers[q.id].toString().trim() !== "";
                  const isFlagged = flagged[idx];
                  const isCurrent = currentIdx === idx;
                  
                  let gridStyle = "border-brand-border hover:border-brand-muted bg-brand-surface text-brand-text";
                  if (hasAnswer) gridStyle = "bg-brand-secondary/15 border-brand-secondary text-brand-secondary-hover font-bold";
                  if (isFlagged) gridStyle = "bg-orange-500/10 border-orange-500 text-orange-600 font-bold";
                  if (isCurrent) gridStyle = "border-brand-primary bg-brand-primary/5 text-brand-primary ring-2 ring-brand-primary/30 font-bold";
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentIdx(idx)}
                      className={`relative aspect-square rounded-xl border flex flex-col items-center justify-center text-xs transition-all ${gridStyle}`}
                    >
                      {idx + 1}
                      {isFlagged && (
                        <Flag className="w-2.5 h-2.5 absolute top-1 right-1 fill-current text-orange-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-brand-border text-xs text-brand-muted">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-brand-secondary/15 border border-brand-secondary"></div>
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-orange-500/10 border border-orange-500"></div>
                  <span>Flagged for Review</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-brand-surface border border-brand-border"></div>
                  <span>Unanswered</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESULTS DISPLAY PANEL */}
      {phase === "results" && exam && (
        <div className="max-w-4xl mx-auto w-full px-4 pt-6 flex flex-col gap-6">
          <div className="glass-panel p-6 sm:p-8 flex flex-col gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-brand-secondary/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
            
            {/* Header / Score Gauge */}
            <div className="flex flex-col sm:flex-row items-center gap-6 justify-between border-b border-brand-border pb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-brand-secondary/10 text-brand-secondary rounded-2xl">
                  <Award className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-brand-text">Exam Graded Instantly</h1>
                  <p className="text-xs text-brand-muted mt-0.5">Attempted on {new Date(exam.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Score visual ring */}
              <div className="flex items-center gap-4 bg-brand-bg p-4 rounded-2xl border border-brand-border shadow-sm">
                <div className="relative w-16 h-16">
                  {/* Outer circle SVG */}
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="32" cy="32" r="26" strokeWidth="4" stroke="var(--brand-border)" fill="transparent" />
                    <circle 
                      cx="32" 
                      cy="32" 
                      r="26" 
                      strokeWidth="5" 
                      stroke="var(--brand-primary)" 
                      fill="transparent" 
                      strokeDasharray={2 * Math.PI * 26}
                      strokeDashoffset={(2 * Math.PI * 26) * (1 - exam.percentage / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-base font-extrabold text-brand-text">{exam.percentage}%</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-brand-muted font-semibold">Your Grade</span>
                  <span className="text-lg font-bold text-brand-text">
                    {exam.percentage >= 90 && "Excellent (A)"}
                    {exam.percentage >= 80 && exam.percentage < 90 && "Very Good (B)"}
                    {exam.percentage >= 70 && exam.percentage < 80 && "Good (C)"}
                    {exam.percentage >= 50 && exam.percentage < 70 && "Pass (D)"}
                    {exam.percentage < 50 && "Fail (F)"}
                  </span>
                  <span className="text-xs font-semibold text-brand-primary mt-0.5">
                    {exam.score} / 30 Questions Correct
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-brand-border bg-brand-bg flex flex-col gap-1.5">
                <span className="text-xs font-bold text-brand-muted uppercase">Difficulty</span>
                <span className="text-sm font-bold text-brand-text">{exam.difficulty}</span>
              </div>
              <div className="p-4 rounded-xl border border-brand-border bg-brand-bg flex flex-col gap-1.5">
                <span className="text-xs font-bold text-brand-muted uppercase">Time Limit</span>
                <span className="text-sm font-bold text-brand-text">{exam.time_limit} mins</span>
              </div>
              <div className="p-4 rounded-xl border border-brand-border bg-brand-bg flex flex-col gap-1.5">
                <span className="text-xs font-bold text-brand-muted uppercase">Time Taken</span>
                <span className="text-sm font-bold text-brand-text">
                  {Math.floor(exam.time_taken / 60)}m {exam.time_taken % 60}s
                </span>
              </div>
              <div className="p-4 rounded-xl border border-brand-border bg-brand-bg flex flex-col gap-1.5">
                <span className="text-xs font-bold text-brand-muted uppercase">Flagged Questions</span>
                <span className="text-sm font-bold text-brand-text">{flaggedCount}</span>
              </div>
            </div>

            {/* AI DIAGNOSTICS & PERFORMANCE ANALYSIS */}
            {exam.analysis && (
              <div className="p-6 rounded-2xl bg-brand-secondary/5 border border-brand-secondary/20 flex flex-col gap-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-16 h-16 bg-brand-secondary/10 rounded-full blur-xl"></div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-brand-secondary" />
                  <h3 className="font-extrabold text-brand-text text-sm">AI Performance Diagnosis</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Strong Topics */}
                  <div className="p-4 rounded-xl border border-green-500/10 bg-green-500/5 flex flex-col gap-2">
                    <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Strong Topics (Mastered)
                    </span>
                    <ul className="text-xs text-brand-text flex flex-col gap-1 pl-3 list-disc">
                      {exam.analysis.strong_topics?.map((topic, i) => (
                        <li key={i} className="font-semibold">{topic}</li>
                      ))}
                      {(!exam.analysis.strong_topics || exam.analysis.strong_topics.length === 0) && (
                        <span className="text-brand-muted italic">No distinct strengths identified yet. Keep practicing!</span>
                      )}
                    </ul>
                  </div>

                  {/* Weak Topics */}
                  <div className="p-4 rounded-xl border border-red-500/10 bg-red-500/5 flex flex-col gap-2">
                    <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Weak Topics (Needs Study)
                    </span>
                    <ul className="text-xs text-brand-text flex flex-col gap-1 pl-3 list-disc">
                      {exam.analysis.weak_topics?.map((topic, i) => (
                        <li key={i} className="font-semibold">{topic}</li>
                      ))}
                      {(!exam.analysis.weak_topics || exam.analysis.weak_topics.length === 0) && (
                        <span className="text-brand-muted italic">No major weak topics identified. Superb job!</span>
                      )}
                    </ul>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-brand-border bg-brand-surface flex flex-col gap-2">
                  <span className="text-xs font-bold text-brand-muted">Actionable Recommendations</span>
                  <ul className="text-xs text-brand-text flex flex-col gap-1.5 pl-3 list-decimal">
                    {exam.analysis.recommendations?.map((rec, i) => (
                      <li key={i} className="font-medium text-brand-muted"><span className="text-brand-text font-semibold">{rec}</span></li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* ACTION ITEMS BLOCK */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setPhase("setup")}
                className="py-3 px-5 rounded-xl border border-brand-border bg-brand-surface hover:bg-brand-bg text-brand-text font-bold text-sm transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Generate New Exam
              </button>

              <button
                onClick={handleTutorWeakTopics}
                className="py-3 px-5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-sm transition-all flex items-center gap-2 shadow-sm"
              >
                <Brain className="w-4 h-4" />
                Start AI Tutor Session on Weak Areas
              </button>

              <button
                onClick={() => onSwitchMode && onSwitchMode("flashcards")}
                className="py-3 px-5 rounded-xl border border-brand-border bg-brand-surface hover:bg-brand-bg text-brand-text font-bold text-sm transition-all flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                Open Related Flashcards
              </button>
            </div>
          </div>

          {/* DETAILED QUESTION REVIEW */}
          <div className="glass-panel p-6 sm:p-8 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h2 className="font-bold text-brand-text text-base">Question by Question Review</h2>
              
              {/* Filter Tabs */}
              <div className="flex rounded-xl bg-brand-bg border border-brand-border p-1 w-full sm:w-auto">
                {[
                  { id: "all", label: "All Questions" },
                  { id: "incorrect", label: "Incorrect Only" },
                  { id: "flagged", label: "Flagged" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setResultsFilter(tab.id)}
                    className={`flex-1 sm:flex-none py-1.5 px-3.5 rounded-lg text-xs font-bold transition-all ${
                      resultsFilter === tab.id
                        ? "bg-brand-surface border border-brand-border text-brand-primary shadow-sm"
                        : "text-brand-muted hover:text-brand-text"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Questions List */}
            <div className="flex flex-col gap-6">
              {exam.questions.map((q, idx) => {
                const isCorrect = q.is_correct;
                const userAns = q.user_answer;
                
                // Filtering logic
                if (resultsFilter === "incorrect" && isCorrect) return null;
                if (resultsFilter === "flagged" && !flagged[idx]) return null;

                let scoreLabel = null;
                if (q.type === "short_answer") {
                  scoreLabel = `Score: ${q.score}/10`;
                }

                return (
                  <div
                    key={idx}
                    className={`p-5 rounded-2xl border transition-all flex flex-col gap-4 ${
                      isCorrect 
                        ? "border-green-500/15 bg-green-500/5" 
                        : "border-red-500/15 bg-red-500/5"
                    }`}
                  >
                    {/* Top Row: Q Number, Type, Result */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-brand-text text-sm">Question {idx + 1}</span>
                        <span className="text-[10px] uppercase font-bold text-brand-muted bg-brand-bg px-2 py-0.5 rounded border border-brand-border">
                          {q.type === "mcq" && "MCQ"}
                          {q.type === "true_false" && "True/False"}
                          {q.type === "fill_blank" && "Fill In Blank"}
                          {q.type === "short_answer" && "Short Answer"}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {scoreLabel && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            isCorrect ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                          }`}>
                            {scoreLabel}
                          </span>
                        )}
                        {isCorrect ? (
                          <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4 fill-current" /> Correct
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                            <XCircle className="w-4 h-4 fill-current" /> Incorrect
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Question Text */}
                    <h3 className="font-semibold text-brand-text text-sm sm:text-base leading-relaxed">
                      {q.type === "fill_blank" ? q.sentence : (q.question || q.statement)}
                    </h3>

                    {/* User Answer vs Correct Answer */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-brand-surface p-4 rounded-xl border border-brand-border">
                      <div className="flex flex-col gap-1">
                        <span className="text-brand-muted font-bold">Your Answer</span>
                        <span className={`font-bold ${userAns !== undefined && userAns !== null && userAns.toString().trim() !== "" ? "text-brand-text" : "text-brand-muted italic"}`}>
                          {userAns === true && "TRUE"}
                          {userAns === false && "FALSE"}
                          {userAns !== true && userAns !== false && (userAns && userAns.toString().trim() !== "" ? userAns.toString() : "Not answered")}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 border-t sm:border-t-0 sm:border-l border-brand-border pt-2.5 sm:pt-0 sm:pl-4">
                        <span className="text-brand-primary font-bold">Correct Answer</span>
                        <span className="font-extrabold text-brand-text">
                          {q.type === "true_false" && (q.correct_answer ? "TRUE" : "FALSE")}
                          {q.type === "fill_blank" && q.blank_word}
                          {q.type !== "true_false" && q.type !== "fill_blank" && (q.correct_answer || q.blank_word)}
                        </span>
                      </div>
                    </div>

                    {/* AI Explanation / Feedback */}
                    <div className="p-4 rounded-xl bg-brand-bg/60 border border-brand-border/40 text-xs text-brand-muted flex flex-col gap-1">
                      <span className="font-bold text-brand-text flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-brand-secondary" /> Explanation
                      </span>
                      <p className="leading-relaxed mt-1">
                        {q.feedback ? q.feedback : q.explanation}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION SUBMIT DIALOG */}
      <AnimatePresence>
        {submitConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel max-w-sm w-full p-6 flex flex-col gap-5 bg-brand-surface border border-brand-border shadow-2xl"
            >
              <div className="flex items-center gap-3 text-brand-primary">
                <AlertTriangle className="w-8 h-8" />
                <h3 className="text-lg font-bold text-brand-text">Submit Mock Exam?</h3>
              </div>

              <div className="text-xs text-brand-muted flex flex-col gap-2">
                <p>Are you sure you want to finish and submit your exam for grading?</p>
                {unansweredCount > 0 && (
                  <p className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 font-bold rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    You have **{unansweredCount} unanswered questions** remaining!
                  </p>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setSubmitConfirmOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-brand-border bg-brand-surface text-brand-text font-bold text-xs hover:bg-brand-bg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => submitExam(false)}
                  className="py-2.5 px-5 rounded-xl bg-brand-primary text-white font-bold text-xs hover:bg-brand-primary-hover transition-all shadow-sm"
                >
                  Submit for Grading
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
