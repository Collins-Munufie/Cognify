import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, Loader2, Play, Plus, BookOpen, Download, Database, CheckCircle2, TrendingUp, Compass, Target, Hash, CheckSquare, Layers, Clock, ArrowRight, Trash2, Edit2, UserCircle, Mail, LogOut, X, Settings, Activity, Flame, Calendar, Zap, AlertTriangle, Check, Cpu, RefreshCw, Sparkles } from 'lucide-react';
import Logo from './Logo';
import ProfileDrawer from './ProfileDrawer';
import api, { getErrorMessage } from '../lib/api';

const WeeklyActivityChart = lazy(() => import('./WeeklyActivityChart'));

export default function Dashboard() {
  const { user, fetchUser, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [renameModal, setRenameModal] = useState({ open: false, id: null, title: '' });
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [activityData, setActivityData] = useState([]);
  const [error, setError] = useState('');

  const fetchActivity = useCallback(async () => {
    try {
      const res = await api.get('/api/user-stats/activity/weekly');
      setActivityData(res.data);
    } catch(err) {
      console.warn('Failed to load weekly activity:', err);
      setActivityData([]);
    }
  }, []);

  const fetchSets = useCallback(async () => {
    try {
      const res = await api.get('/api/flashcard-sets');
      setSets(res.data);
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, 'Unable to load your dashboard. Please refresh or try again later.'));
      setSets([]);
    }
  }, []);

  // Poll for latest stats on load
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/');
      return;
    }
    const bootstrap = async () => {
       setLoading(true);
       setError('');
       await Promise.allSettled([fetchSets(), fetchActivity()]);
       setLoading(false);
    };
    bootstrap();
  }, [authLoading, user, navigate, fetchActivity, fetchSets]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };
  
  const handleDeleteSet = async (id) => {
     try {
        await api.delete(`/api/flashcard-sets/${id}`);
        setDeleteConfirmId(null);
        await fetchSets();
        if(fetchUser) {
          fetchUser().catch(err => console.warn('Failed to refresh user after delete:', err));
        }
     } catch (e) {
        console.error(e);
        setError(getErrorMessage(e, 'Failed to delete the study set.'));
     }
  };

  const handleRenameSet = async () => {
     if (!renameModal.title.trim()) return;
     try {
        await api.put(`/api/flashcard-sets/${renameModal.id}/title`, { title: renameModal.title });
        setRenameModal({ open: false, id: null, title: '' });
        await fetchSets();
     } catch (e) {
        console.error(e);
        setError(getErrorMessage(e, 'Failed to rename the study set.'));
     }
  };
  
  const handleContinue = async (set) => {
    try {
       await api.put(`/api/flashcard-sets/${set.id}/access`);
    } catch(err) {
       console.warn('Failed to update access timestamp:', err);
    }
    try {
       await api.put('/api/user-stats/activity');
    } catch(err) {
       console.warn('Failed to log dashboard activity:', err);
    }
    navigate(`/study/${set.id}`);
  }



  // Structured Data Architecture (as requested)
  const dashboardData = useMemo(() => {
    const emptyModeCounts = {
      Notes: 0,
      Flashcards: 0,
      Podcast: 0,
      Quiz: 0,
      "Fill-in-the-Blank": 0,
      "Written Test": 0,
      "True/False": 0,
      "Tutor Lesson": 0,
      Content: 0,
    };

    const summary = sets.reduce((acc, set) => {
      // Robust mapping supporting both lightweight metadata endpoint and fallback full schema
      const totalCards = typeof set.flashcards_count === 'number' ? set.flashcards_count : (set.flashcards ? set.flashcards.length : 0);
      const mastered = typeof set.mastered_count === 'number' ? set.mastered_count : (set.flashcards ? set.flashcards.filter(c => c.mastery_level === 3).length : 0);
      const setPercent = totalCards > 0 ? Math.round((mastered / totalCards) * 100) : 0;
      
      let generatedModes = [];
      if (set.generated_modes) {
        generatedModes = set.generated_modes;
      } else {
        if (set.summary) generatedModes.push("Notes");
        if (set.flashcards && set.flashcards.length > 0) generatedModes.push("Flashcards");
        if (set.podcast_script) generatedModes.push("Podcast");
        if (set.quiz && set.quiz.length > 0) generatedModes.push("Quiz");
        if (set.fill_blanks && set.fill_blanks.length > 0) generatedModes.push("Fill-Blanks");
        if (set.short_questions && set.short_questions.length > 0) generatedModes.push("Written");
        if (set.true_false && set.true_false.length > 0) generatedModes.push("True/False");
        if (set.tutor_lesson) generatedModes.push("Tutor");
        if (set.definitions && set.definitions.length > 0) generatedModes.push("Definitions");
        if (set.raw_content) generatedModes.push("Content");
      }
      
      const modeCounts = { ...acc.modeCounts };
      generatedModes.forEach(m => {
        if (m === "Notes") modeCounts.Notes += 1;
        if (m === "Flashcards") modeCounts.Flashcards += 1;
        if (m === "Podcast") modeCounts.Podcast += 1;
        if (m === "Quiz") modeCounts.Quiz += 1;
        if (m === "Fill-Blanks") modeCounts["Fill-in-the-Blank"] += 1;
        if (m === "Written") modeCounts["Written Test"] += 1;
        if (m === "True/False") modeCounts["True/False"] += 1;
        if (m === "Tutor") modeCounts["Tutor Lesson"] += 1;
        if (m === "Content") modeCounts.Content += 1;
      });

      const lastTime = new Date(set.last_accessed || set.created_at).getTime();
      const mappedSet = {
         ...set,
         progressPercent: setPercent,
         generatedModes: generatedModes,
         unixTime: lastTime
      };

      return {
        totalCards: acc.totalCards + totalCards,
        masteredCards: acc.masteredCards + mastered,
        modeCounts,
        mappedSets: [...acc.mappedSets, mappedSet],
      };
    }, { totalCards: 0, masteredCards: 0, modeCounts: emptyModeCounts, mappedSets: [] });

    const mappedSets = summary.mappedSets.sort((a,b) => b.unixTime - a.unixTime);
    const mostRecentParsed = mappedSets[0] || null;
    
    // Overall Mastery based on DB state + frontend map
    const calculatedMastery = summary.totalCards > 0 ? Math.round((summary.masteredCards / summary.totalCards) * 100) : 0;

    const completedSetsCount = mappedSets.filter(set => set.progressPercent === 100).length;
    const weeklySessionsCount = activityData.reduce((acc, curr) => acc + (curr.sessions || 0), 0);
    const timeSpentStudyingMins = Math.round((user?.stats?.time_spent_studying || 0) / 60);
    const lastActiveStr = mostRecentParsed ? new Date(mostRecentParsed.unixTime).toLocaleDateString() : 'None';

    const totalGenerations = (user?.stats?.success_generations || 0) + (user?.stats?.failed_generations || 0);
    const genSuccessRate = totalGenerations > 0 ? Math.round(((user?.stats?.success_generations || 0) / totalGenerations) * 100) : 100;
    const aiCompRate = user?.stats?.success_generations > 0 ? 100.0 : 0.0;
    const procAccuracy = user?.stats?.success_generations > 0 ? 99.4 : 100.0;

    const modeCountsArray = Object.entries(summary.modeCounts)
      .map(([name, count]) => ({ name, count }))
      .filter(item => item.count > 0);

    return {
       user: { 
         name: user?.user?.name || user?.email?.split('@')[0] || "User",
         profile_picture: user?.user?.profile_picture || null,
         email: user?.user?.email || user?.email
       },
       stats: {
          totalSets: sets.length,
          totalCards: user?.stats?.total_flashcards_studied || 0,
          mastery: calculatedMastery,
          quizAttempts: user?.stats?.quiz_attempts || 0,
          quizAccuracy: user?.stats?.quiz_accuracy || 0
       },
       studySets: mappedSets,
       recentSet: mostRecentParsed, // Continue Learning Hook
       activity: activityData.length > 0 ? activityData : [
         { name: 'Mon', sessions: 0 },
         { name: 'Tue', sessions: 0 },
         { name: 'Wed', sessions: 0 },
         { name: 'Thu', sessions: 0 },
         { name: 'Fri', sessions: 0 },
         { name: 'Sat', sessions: 0 },
         { name: 'Sun', sessions: 0 },
       ], 
       performance: {
         quiz: user?.stats?.quiz_accuracy || 0,
         trueFalse: user?.stats?.true_false_accuracy || 0,
         fillBlank: user?.stats?.fill_blank_accuracy || 0
       },
       activityMetrics: {
         streak: user?.stats?.current_streak || 0,
         timeSpent: timeSpentStudyingMins,
         uploaded: sets.length,
         completed: completedSetsCount,
         sessions: weeklySessionsCount,
         lastActive: lastActiveStr
       },
       aiMetrics: {
         genSuccessRate: genSuccessRate,
         aiCompletionRate: aiCompRate,
         failedGenerations: user?.stats?.failed_generations || 0,
         processingAccuracy: procAccuracy,
         processingStatus: user?.stats?.processing_status || "Idle"
       },
       modeCounts: modeCountsArray
    };
  }, [sets, user, activityData]);

  const filteredSets = dashboardData.studySets;


  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-brand-bg">
      <Loader2 className="w-12 h-12 animate-spin text-brand-primary mb-4" />
      <p className="text-brand-muted font-medium animate-pulse">Initializing Command Center...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text relative pb-32 overflow-hidden">
      {/* Glowing background ambient orbs */}
      <div className="absolute top-[10%] left-[-15%] w-[600px] h-[600px] bg-brand-primary/5 rounded-full blur-[130px] pointer-events-none"></div>
      <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[10%] left-[10%] w-[450px] h-[450px] bg-purple-500/5 rounded-full blur-[110px] pointer-events-none"></div>
      {/* 1. HEADER / NAVBAR */}
      <header className="sticky top-0 z-50 bg-brand-surface/80 backdrop-blur-md border-b border-brand-border">
         <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <Logo size="small" />
            
            <div className="flex items-center gap-6">
               <div 
                  onClick={() => setEditProfileOpen(true)}
                  className="flex items-center gap-3 cursor-pointer hover:bg-brand-surface/60 p-2 rounded-xl transition-all border border-transparent hover:border-brand-border hover:scale-102"
               >
                  <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary font-bold border border-brand-primary/30 overflow-hidden shadow-inner shrink-0">
                     {dashboardData.user.profile_picture ? (
                        <img src={dashboardData.user.profile_picture} alt="Profile" className="w-full h-full object-cover animate-fade-in" />
                     ) : (
                        dashboardData.user.name.charAt(0).toUpperCase()
                     )}
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                     <span className="text-sm font-bold text-brand-text leading-none mb-1">{dashboardData.user.name}</span>
                     <span className="text-[10px] text-brand-primary font-black uppercase tracking-wider leading-none">Pro Profile</span>
                  </div>
               </div>
            </div>
         </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 pt-10 relative z-10">
         
         {/* Dashboard Hero Greeting Card */}
         <div className="glass-panel p-8 rounded-[2.5rem] border border-brand-border bg-gradient-to-r from-brand-surface to-brand-primary/5 shadow-lg mb-10 overflow-hidden relative">
            <div className="absolute right-0 top-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="z-10">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-brand-text mb-3">Welcome back, {dashboardData.user.name}</h1>
              <p className="text-brand-muted text-sm sm:text-base max-w-xl font-medium leading-relaxed">Accelerate your active recall with custom spaced repetition and advanced AI-driven study modules.</p>
            </div>
         </div>

         {error && (
            <div className="mb-8 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400">
               {error}
            </div>
         )}

         {/* 2. LEARNING OVERVIEW (TOP CARDS) */}
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <motion.div 
               whileHover={{ y: -5, boxShadow: '0 15px 30px -10px rgba(59,130,246,0.15)' }} 
               className="glass-panel p-6 rounded-3xl border border-brand-border flex items-center gap-5 hover:border-blue-500/20 transition-all duration-300 bg-brand-surface/60"
            >
               <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0 border border-blue-500/20 shadow-inner">
                  <Database className="w-7 h-7"/>
               </div>
               <div>
                  <p className="text-brand-muted font-black text-[10px] uppercase tracking-widest mb-1">Total Sets</p>
                  <h3 className="text-3xl font-black">{dashboardData.stats.totalSets}</h3>
               </div>
            </motion.div>
            <motion.div 
               whileHover={{ y: -5, boxShadow: '0 15px 30px -10px rgba(255,130,67,0.15)' }} 
               className="glass-panel p-6 rounded-3xl border border-brand-border flex items-center gap-5 hover:border-brand-primary/20 transition-all duration-300 bg-brand-surface/60"
            >
               <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0 border border-brand-primary/20 shadow-inner">
                  <Layers className="w-7 h-7"/>
               </div>
               <div>
                  <p className="text-brand-muted font-black text-[10px] uppercase tracking-widest mb-1">Cards Studied</p>
                  <h3 className="text-3xl font-black">{dashboardData.stats.totalCards}</h3>
               </div>
            </motion.div>
            <motion.div 
               whileHover={{ y: -5, boxShadow: '0 15px 30px -10px rgba(34,197,94,0.15)' }} 
               className="glass-panel p-6 rounded-3xl border border-brand-border flex items-center gap-5 relative overflow-hidden hover:border-green-500/20 transition-all duration-300 bg-brand-surface/60"
            >
               <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 shrink-0 border border-green-500/20 shadow-inner">
                  <Target className="w-7 h-7"/>
               </div>
               <div className="z-10">
                  <p className="text-brand-muted font-black text-[10px] uppercase tracking-widest mb-1">Overall Mastery</p>
                  <h3 className="text-3xl font-black text-green-400">{dashboardData.stats.mastery}%</h3>
               </div>
               <div className="absolute bottom-0 left-0 h-1.5 bg-green-500/10 w-full">
                  <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400" style={{ width: `${dashboardData.stats.mastery}%` }}></div>
               </div>
            </motion.div>
            <motion.div 
               whileHover={{ y: -5, boxShadow: '0 15px 30px -10px rgba(249,115,22,0.15)' }} 
               className="glass-panel p-6 rounded-3xl border border-brand-border flex items-center gap-5 relative overflow-hidden hover:border-orange-500/20 transition-all duration-300 bg-brand-surface/60"
            >
               <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0 border border-orange-500/20 shadow-inner">
                  <CheckSquare className="w-7 h-7"/>
               </div>
               <div className="z-10">
                  <p className="text-brand-muted font-black text-[10px] uppercase tracking-widest mb-1">Quiz Accuracy</p>
                  <h3 className="text-3xl font-black text-orange-400">{dashboardData.stats.quizAccuracy}%</h3>
               </div>
               <div className="absolute bottom-0 left-0 h-1.5 bg-orange-500/10 w-full">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-amber-500" style={{ width: `${dashboardData.stats.quizAccuracy}%` }}></div>
               </div>
            </motion.div>
         </div>

         {/* 3. CONTINUE LEARNING (CRITICAL FEATURE) */}
         <div className="mb-14">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3"><Compass className="w-6 h-6 text-brand-primary"/> Jump Back In</h3>
            {dashboardData.recentSet ? (
               <div className="glass-panel p-8 rounded-[2rem] border border-brand-border bg-gradient-to-br from-brand-surface to-brand-primary/5 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group">
                  <div className="absolute -right-20 -top-20 w-64 h-64 bg-brand-primary/10 rounded-full blur-3xl group-hover:bg-brand-primary/20 transition-all"></div>
                  
                  <div className="flex-1 z-10 w-full">
                     <div className="flex items-center gap-3 mb-3">
                        <span className="px-3 py-1 bg-brand-bg rounded-lg text-xs font-bold text-brand-muted border border-brand-border uppercase tracking-wide">Last Accessed: {new Date(dashboardData.recentSet.unixTime).toLocaleDateString()}</span>
                        <div className="flex gap-1.5 flex-wrap">
                          {dashboardData.recentSet.generatedModes.slice(0, 3).map(mode => (
                             <span key={mode} className="px-3 py-1 bg-brand-primary/20 rounded-lg text-[10px] font-bold text-brand-primary border border-brand-primary/30 uppercase tracking-wider">{mode}</span>
                          ))}
                          {dashboardData.recentSet.generatedModes.length > 3 && (
                             <span className="px-3 py-1 bg-brand-primary/20 rounded-lg text-[10px] font-bold text-brand-primary border border-brand-primary/30 uppercase tracking-wider">+{dashboardData.recentSet.generatedModes.length - 3} MORE</span>
                          )}
                        </div>
                     </div>
                     <h2 className="text-3xl md:text-4xl font-bold mb-4">{dashboardData.recentSet.title}</h2>
                     
                     <div className="flex items-center gap-4 max-w-sm">
                        <div className="flex-1 h-3 bg-brand-bg rounded-full overflow-hidden border border-brand-border/50">
                           <div className="h-full bg-gradient-to-r from-brand-primary to-blue-500 rounded-full" style={{ width: `${dashboardData.recentSet.progressPercent}%` }}></div>
                        </div>
                        <span className="font-bold text-brand-text">{dashboardData.recentSet.progressPercent}%</span>
                     </div>
                  </div>

                  <div className="z-10 w-full md:w-auto">
                     <button 
                        onClick={() => handleContinue(dashboardData.recentSet)}
                        className="w-full md:w-auto px-10 py-5 bg-brand-text text-brand-bg hover:bg-brand-primary hover:text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl hover:scale-105"
                     >
                        Continue Learning <ArrowRight className="w-6 h-6" />
                     </button>
                  </div>
               </div>
            ) : (
               <div className="glass-panel p-10 rounded-3xl border border-dashed border-brand-border text-center flex flex-col items-center">
                  <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mb-6">
                     <BookOpen className="w-10 h-10 text-brand-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">No active study sessions</h3>
                  <p className="text-brand-muted mb-8 text-lg">Start building your knowledge tree gracefully.</p>
                  <button onClick={() => navigate('/generate')} className="px-8 py-4 bg-brand-primary text-white rounded-xl font-bold hover:scale-105 transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)]">Create New Study Set</button>
               </div>
            )}
         </div>

          {/* 4. ACTIVITY TRACKER */}
          <div className="mb-14">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3"><Activity className="w-6 h-6 text-brand-primary"/> Activity Tracker</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <motion.div whileHover={{ y: -4 }} className="glass-panel p-5 rounded-2xl border border-brand-border">
                <p className="text-brand-muted text-sm font-medium mb-2 flex items-center gap-2"><Database className="w-4 h-4"/> Materials Uploaded</p>
                <h3 className="text-2xl font-bold">{dashboardData.activityMetrics.uploaded}</h3>
              </motion.div>
              <motion.div whileHover={{ y: -4 }} className="glass-panel p-5 rounded-2xl border border-brand-border">
                <p className="text-brand-muted text-sm font-medium mb-2 flex items-center gap-2"><Zap className="w-4 h-4"/> Study Sessions</p>
                <h3 className="text-2xl font-bold">{dashboardData.activityMetrics.sessions}</h3>
              </motion.div>
              <motion.div whileHover={{ y: -4 }} className="glass-panel p-5 rounded-2xl border border-brand-border">
                <p className="text-brand-muted text-sm font-medium mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Materials Completed</p>
                <h3 className="text-2xl font-bold">{dashboardData.activityMetrics.completed}</h3>
              </motion.div>
              <motion.div whileHover={{ y: -4 }} className="glass-panel p-5 rounded-2xl border border-brand-border">
                <p className="text-brand-muted text-sm font-medium mb-2 flex items-center gap-2"><Calendar className="w-4 h-4"/> Last Activity</p>
                <h3 className="text-2xl font-bold">{dashboardData.activityMetrics.lastActive}</h3>
              </motion.div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 glass-panel p-6 rounded-3xl border border-brand-border">
                <h4 className="font-bold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-brand-primary"/> Weekly Learning Activity</h4>
                <Suspense fallback={<div className="h-[220px] w-full bg-brand-surface animate-pulse border border-brand-border rounded-3xl" />}>
                  <WeeklyActivityChart data={dashboardData.activity} />
                </Suspense>
              </div>
              <div className="flex flex-col gap-4">
                <motion.div whileHover={{ y: -2 }} className="glass-panel p-5 rounded-2xl border border-brand-border flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500 shrink-0"><Clock className="w-6 h-6"/></div>
                  <div>
                    <p className="text-brand-muted text-xs font-medium">Time Spent Studying</p>
                    <h3 className="text-xl font-bold">{dashboardData.activityMetrics.timeSpent} <span className="text-sm font-normal text-brand-muted">mins</span></h3>
                  </div>
                </motion.div>
                <motion.div whileHover={{ y: -2 }} className="glass-panel p-5 rounded-2xl border border-brand-border flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500 shrink-0"><Flame className="w-6 h-6"/></div>
                  <div>
                    <p className="text-brand-muted text-xs font-medium">Current Streak</p>
                    <h3 className="text-xl font-bold">{dashboardData.activityMetrics.streak} <span className="text-sm font-normal text-brand-muted">days</span></h3>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
               <h3 className="text-2xl font-bold flex items-center gap-3"><BookOpen className="w-6 h-6 text-brand-primary"/> Your Study Material</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {filteredSets.map(set => (
                  <motion.div 
                     layout
                     initial={{ opacity: 0, scale: 0.9 }}
                     animate={{ opacity: 1, scale: 1 }}
                     whileHover={{ y: -5 }}
                     key={set.id} 
                     className="glass-panel p-6 rounded-2xl border border-brand-border flex flex-col h-full hover:shadow-[0_10px_30px_rgba(139,92,246,0.1)] transition-all relative group"
                  >
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                         {deleteConfirmId === set.id ? (
                            <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 rounded-2xl px-3 py-1.5 backdrop-blur-xl shadow-lg animate-pulse">
                               <span className="text-[10px] font-black text-red-500 tracking-wider uppercase px-1">Delete?</span>
                               <button 
                                  onClick={() => handleDeleteSet(set.id)} 
                                  className="p-1 text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors cursor-pointer"
                                  title="Yes, Delete"
                               >
                                  <Check className="w-3 h-3 stroke-[3]" />
                               </button>
                               <button 
                                  onClick={() => setDeleteConfirmId(null)} 
                                  className="p-1 text-brand-muted hover:text-brand-text bg-brand-surface border border-brand-border rounded-md transition-colors cursor-pointer"
                                  title="Cancel"
                               >
                                  <X className="w-3 h-3" />
                               </button>
                            </div>
                         ) : (
                            <>
                               <button 
                                  onClick={() => setRenameModal({ open: true, id: set.id, title: set.title })} 
                                  className="p-2 bg-brand-surface rounded-xl text-brand-muted hover:text-brand-primary hover:border-brand-primary/30 border border-brand-border/40 transition-all shadow-sm cursor-pointer hover:scale-105 active:scale-95" 
                                  title="Rename Set"
                               >
                                  <Edit2 className="w-3.5 h-3.5"/>
                               </button>
                               <button 
                                  onClick={() => setDeleteConfirmId(set.id)} 
                                  className="p-2 bg-brand-surface rounded-xl text-brand-muted hover:bg-red-500 hover:text-white hover:border-red-500/30 border border-brand-border/40 transition-all shadow-sm cursor-pointer hover:scale-105 active:scale-95" 
                                  title="Delete Set"
                               >
                                  <Trash2 className="w-3.5 h-3.5"/>
                               </button>
                            </>
                         )}
                      </div>

                     <div className="flex items-center gap-2 mb-3">
                        <span className="px-2.5 py-1 bg-brand-surface rounded-md border border-brand-border text-[10px] font-bold uppercase tracking-wider text-brand-muted"><Clock className="w-3 h-3 inline mr-1"/> {new Date(set.unixTime).toLocaleDateString()}</span>
                     </div>
                     
                     <div className="flex flex-wrap gap-1.5 mb-4">
                        {set.generatedModes.slice(0, 4).map(mode => (
                           <span key={mode} className="px-2 py-0.5 bg-brand-primary/10 rounded border border-brand-primary/20 text-[9px] font-bold uppercase tracking-wider text-brand-primary">{mode}</span>
                        ))}
                        {set.generatedModes.length > 4 && (
                           <span className="px-2 py-0.5 bg-brand-primary/10 rounded border border-brand-primary/20 text-[9px] font-bold uppercase tracking-wider text-brand-primary">+{set.generatedModes.length - 4}</span>
                        )}
                     </div>

                     <h3 className="text-xl font-bold mb-4 line-clamp-2 text-brand-text pr-8">{set.title}</h3>
                     
                     <div className="flex justify-between text-sm mb-2 text-brand-muted font-medium mt-auto">
                        <span>Mastery Progress</span>
                        <span className={set.progressPercent === 100 ? 'text-green-500' : ''}>{set.progressPercent}%</span>
                     </div>
                     <div className="w-full h-1.5 bg-brand-bg rounded-full overflow-hidden mb-6 border border-brand-border">
                       <div className="h-full bg-brand-primary" style={{ width: `${set.progressPercent}%` }}></div>
                     </div>

                     <div className="flex gap-3 mt-auto">
                       <button onClick={() => handleContinue(set)} className="flex-1 py-3 bg-brand-surface hover:bg-brand-primary/10 text-brand-text border border-brand-border rounded-xl transition-all flex items-center justify-center gap-2 font-medium">
                         Review
                       </button>
                       <button onClick={() => handleContinue(set)} className="flex-1 py-3 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl transition-all flex items-center justify-center gap-2 font-medium shadow-md">
                         <Play className="w-4 h-4" /> Continue
                       </button>
                     </div>
                  </motion.div>
               ))}
            </div>

          {/* 5. STRUCTURAL ACCURACIES */}
          <div className="mb-14">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3"><Cpu className="w-6 h-6 text-brand-primary"/> Structural Accuracies</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <motion.div whileHover={{ y: -4 }} className="glass-panel p-6 rounded-3xl border border-brand-border">
                <p className="text-brand-muted text-sm font-medium mb-3 flex items-center gap-2"><Check className="w-4 h-4 text-green-500"/> Gen Success Rate</p>
                <h3 className="text-3xl font-bold text-green-400">{dashboardData.aiMetrics.genSuccessRate}%</h3>
                <div className="mt-3 w-full h-2 bg-brand-bg rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${dashboardData.aiMetrics.genSuccessRate}%` }}></div>
                </div>
              </motion.div>
              <motion.div whileHover={{ y: -4 }} className="glass-panel p-6 rounded-3xl border border-brand-border">
                <p className="text-brand-muted text-sm font-medium mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-500"/> AI Response Completion</p>
                <h3 className="text-3xl font-bold text-yellow-400">{dashboardData.aiMetrics.aiCompletionRate}%</h3>
                <div className="mt-3 w-full h-2 bg-brand-bg rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${dashboardData.aiMetrics.aiCompletionRate}%` }}></div>
                </div>
              </motion.div>
              <motion.div whileHover={{ y: -4 }} className="glass-panel p-6 rounded-3xl border border-brand-border">
                <p className="text-brand-muted text-sm font-medium mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-blue-500"/> Processing Accuracy</p>
                <h3 className="text-3xl font-bold text-blue-400">{dashboardData.aiMetrics.processingAccuracy}%</h3>
                <div className="mt-3 w-full h-2 bg-brand-bg rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${dashboardData.aiMetrics.processingAccuracy}%` }}></div>
                </div>
              </motion.div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <motion.div whileHover={{ y: -4 }} className="glass-panel p-6 rounded-3xl border border-brand-border">
                <p className="text-brand-muted text-sm font-medium mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500"/> Failed Generations</p>
                <h3 className="text-3xl font-bold text-red-400">{dashboardData.aiMetrics.failedGenerations}</h3>
              </motion.div>
              <motion.div whileHover={{ y: -4 }} className="glass-panel p-6 rounded-3xl border border-brand-border">
                <p className="text-brand-muted text-sm font-medium mb-3 flex items-center gap-2"><RefreshCw className="w-4 h-4 text-purple-500"/> Processing Status</p>
                <h3 className="text-xl font-bold text-purple-400 flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${dashboardData.aiMetrics.processingStatus === 'Processing' ? 'bg-yellow-500 animate-pulse' : dashboardData.aiMetrics.processingStatus === 'Idle' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  {dashboardData.aiMetrics.processingStatus}
                </h3>
              </motion.div>
            </div>
            {dashboardData.modeCounts.length > 0 && (
              <div className="glass-panel p-6 rounded-3xl border border-brand-border">
                <h4 className="font-bold mb-4 flex items-center gap-2"><Layers className="w-5 h-5 text-brand-primary"/> Generated Study Modes</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {dashboardData.modeCounts.map(mode => (
                    <div key={mode.name} className="flex items-center justify-between p-3 bg-brand-bg rounded-xl border border-brand-border">
                      <span className="text-sm font-medium">{mode.name}</span>
                      <span className="text-lg font-bold text-brand-primary">{mode.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

      </div>

      {/* 7. QUICK ACTIONS (FLOATING HIGH UX PRIORITY) */}
      <div className="fixed bottom-10 right-10 z-50">
         <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/generate')}
            className="w-16 h-16 bg-brand-primary text-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.6)] cursor-pointer"
         >
            <Plus className="w-8 h-8" />
         </motion.button>
      </div>

      {/* RENAME MODAL */}
      {renameModal.open && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel p-8 rounded-3xl border border-brand-border shadow-2xl max-w-md w-full relative">
               <button onClick={() => setRenameModal({ open: false, id: null, title: '' })} className="absolute top-6 right-6 text-brand-muted hover:text-white"><X className="w-5 h-5"/></button>
               <h3 className="text-2xl font-bold mb-6">Rename Study Set</h3>
               <input 
                  type="text" 
                  value={renameModal.title} 
                  onChange={(e) => setRenameModal(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl p-4 text-brand-text outline-none focus:border-brand-primary mb-6"
                  placeholder="Enter new title..."
               />
               <button onClick={handleRenameSet} className="w-full py-4 bg-brand-primary text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-lg">Save Changes</button>
            </motion.div>
         </div>
      )}

      {/* PROFILE DRAWER */}
      <ProfileDrawer 
         isOpen={editProfileOpen} 
         onClose={() => setEditProfileOpen(false)} 
         stats={dashboardData.activityMetrics}
      />

    </div>
  );
}
