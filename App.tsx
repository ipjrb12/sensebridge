import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './components/Icon';
import { transcribeAudio, analyzeEnvironment, askSenseBridge } from './services/geminiService';
import { MotionData, ExplorationAnalysisResult, ExplorationLogEntry, QueryResult } from './types';
import { LandingPage } from './components/LandingPage';

// Helper to format floats
const fmt = (n: number) => n.toFixed(2);

// Mock initial motion data
const INITIAL_MOTION: MotionData = {
  accel: { x: 0.02, y: 9.81, z: 0.05 },
  gyro: { x: 0.01, y: 0.00, z: 0.01 }
};

const ANALYSIS_STEPS = [
  "Mapping Visual Terrain...",
  "Analyzing Acoustic Profile...",
  "Integrating Sensor Data...",
  "Triangulating Geo-Location...",
  "Assessing Traveler Safety...",
  "Synthesizing Exploration Insights..."
];

const App: React.FC = () => {
  // --- STATE ---
  const [showLanding, setShowLanding] = useState(true);

  // Inputs
  const [currentFrame, setCurrentFrame] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedAudio, setTranscribedAudio] = useState<string | null>(null);
  const [motionData, setMotionData] = useState<MotionData>(INITIAL_MOTION);
  
  // Analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingText, setLoadingText] = useState("Initializing...");
  const [currentAnalysis, setCurrentAnalysis] = useState<ExplorationAnalysisResult | null>(null);
  const [explorationLog, setExplorationLog] = useState<ExplorationLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Query
  const [userQuery, setUserQuery] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of log when added
  useEffect(() => {
    if (!showLanding) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [explorationLog, showLanding]);

  // --- HANDLERS ---

  // 0. Launch App
  const handleLaunch = () => {
    setShowLanding(false);
  };

  // 1. Image Upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setCurrentFrame(result);
        setCurrentAnalysis(null); // Reset analysis on new image
        setQueryResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // 2. Audio Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/mp3' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          const result = await transcribeAudio(base64Audio);
          setTranscribedAudio(result.transcript);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      setError("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // 3. Motion Simulation
  const simulateMotion = () => {
    // Generate values representing rough terrain traversal
    const newMotion: MotionData = {
      accel: { 
        x: (Math.random() - 0.5) * 8, 
        y: 9.81 + (Math.random() - 0.5) * 5, 
        z: (Math.random() - 0.5) * 8 
      },
      gyro: {
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        z: (Math.random() - 0.5) * 2
      }
    };
    setMotionData(newMotion);
    // Reset after delay
    setTimeout(() => setMotionData(INITIAL_MOTION), 3000);
  };

  // 4. Main Analysis
  const handleAnalyze = async () => {
    if (!currentFrame && !transcribedAudio) {
        setError("Please provide at least Visual or Audio input to analyze.");
        return;
    }
    setError(null);
    setIsAnalyzing(true);
    setQueryResult(null);
    
    // Visualize thought process
    let stepIndex = 0;
    setLoadingText(ANALYSIS_STEPS[0]);
    const stepInterval = setInterval(() => {
      stepIndex = (stepIndex + 1) % ANALYSIS_STEPS.length;
      setLoadingText(ANALYSIS_STEPS[stepIndex]);
    }, 1500);

    try {
      const imageBase64 = currentFrame ? currentFrame.split(',')[1] : null;
      const result = await analyzeEnvironment(imageBase64, transcribedAudio, motionData);
      
      setCurrentAnalysis(result);

      // Log to history
      const newLog: ExplorationLogEntry = {
        ...result,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        imageFrameUrl: currentFrame,
        audioTranscript: transcribedAudio,
      };
      
      setExplorationLog(prev => [newLog, ...prev]);

    } catch (err) {
      setError("Failed to analyze environment. Please try again.");
      console.error(err);
    } finally {
      clearInterval(stepInterval);
      setIsAnalyzing(false);
    }
  };

  // 5. Query Handler
  const handleAsk = async () => {
    if (!currentAnalysis || !userQuery.trim()) return;
    setIsQuerying(true);
    try {
      const result = await askSenseBridge(userQuery, currentAnalysis);
      setQueryResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsQuerying(false);
    }
  };

  // Helper to determine safety color
  const getSafetyColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 50) return "text-yellow-400";
    return "text-red-400";
  };
  
  const getSafetyBg = (score: number) => {
    if (score >= 80) return "bg-emerald-500/10 border-emerald-500/20";
    if (score >= 50) return "bg-yellow-500/10 border-yellow-500/20";
    return "bg-red-500/10 border-red-500/20";
  };

  if (showLanding) {
    return <LandingPage onLaunch={handleLaunch} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      {/* HEADER */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowLanding(true)}>
            <div className="bg-emerald-600 p-2 rounded-lg shadow-lg shadow-emerald-900/50">
              <Icons.Map className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">SenseBridge</h1>
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium tracking-wider uppercase">
                <Icons.Compass className="w-3 h-3" />
                Exploration Edition
              </div>
            </div>
          </div>
          <div className="hidden md:flex gap-4 text-xs font-mono text-slate-500">
             <span>SYS: ONLINE</span>
             <span>GPS: TRIANGULATING...</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: INPUTS (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* A. VISUAL INPUT */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg">
            <div className="p-3 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-slate-300">
                <Icons.Camera className="w-4 h-4 text-emerald-500" />
                Visual Feed
              </h2>
            </div>
            <div className="relative aspect-video bg-black flex items-center justify-center group">
              {currentFrame ? (
                <img src={currentFrame} alt="Feed" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
              ) : (
                <div className="text-slate-600 flex flex-col items-center">
                  <Icons.Eye className="w-12 h-12 opacity-20 mb-2" />
                  <span className="text-xs">No Signal</span>
                </div>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <div className="bg-slate-200 text-slate-900 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2">
                  <Icons.Upload className="w-4 h-4" /> Upload Frame
                </div>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* B. AUDIO & MOTION */}
          <div className="grid grid-cols-2 gap-4">
            {/* Audio */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-3 flex flex-col gap-2">
              <h2 className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                <Icons.Mic className="w-3 h-3" /> Audio Sensor
              </h2>
              <button 
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex-1 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors py-3 ${
                  isRecording 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {isRecording ? "Stop" : "Record"}
              </button>
              {transcribedAudio && (
                <div className="text-[10px] bg-slate-950 p-2 rounded border border-slate-800 text-slate-500 truncate">
                  "{transcribedAudio}"
                </div>
              )}
            </div>

            {/* Motion */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-3 flex flex-col gap-2">
              <h2 className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                <Icons.Activity className="w-3 h-3" /> Motion
              </h2>
              <button 
                onClick={simulateMotion}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium py-3 border border-slate-700"
              >
                Simulate Terrain
              </button>
              <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1">
                <span>Acc: {fmt(motionData.accel.y)}</span>
                <span>Gyr: {fmt(motionData.gyro.x)}</span>
              </div>
            </div>
          </div>

          <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <span className="animate-pulse">{loadingText}</span>
            ) : (
              <>
                <Icons.Map className="w-5 h-5" /> Analyze Environment
              </>
            )}
          </button>
          
          {error && <div className="text-red-400 text-xs text-center bg-red-900/20 p-2 rounded">{error}</div>}
        </div>

        {/* RIGHT COLUMN: INSIGHTS & QUERY (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6 h-[85vh] sticky top-24">
          
          {/* B. EXPLORATION INSIGHTS PANEL */}
          <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col shadow-2xl">
            {currentAnalysis ? (
              <div className="flex flex-col h-full">
                {/* Header with Location & Environment */}
                <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-emerald-400 mb-1">
                      <Icons.Map className="w-3 h-3" />
                      <span className="text-xs font-bold uppercase tracking-wider">{currentAnalysis.location_estimation}</span>
                    </div>
                    <h2 className="text-3xl font-light text-white leading-tight">{currentAnalysis.environment_type}</h2>
                    <p className="text-slate-400 text-sm max-w-lg">{currentAnalysis.terrain_summary}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold text-slate-200">{Math.round(currentAnalysis.confidence * 100)}<span className="text-lg text-slate-600">%</span></div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest">Confidence</div>
                  </div>
                </div>

                {/* Safety & Status Bar */}
                <div className="px-6 py-3 bg-slate-950 border-b border-slate-800 flex items-center gap-4 overflow-x-auto">
                   <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getSafetyBg(currentAnalysis.safety_score)}`}>
                      <Icons.ShieldCheck className={`w-4 h-4 ${getSafetyColor(currentAnalysis.safety_score)}`} />
                      <span className={`text-xs font-bold ${getSafetyColor(currentAnalysis.safety_score)}`}>
                        Safety Score: {currentAnalysis.safety_score}/100
                      </span>
                   </div>
                   <div className="text-xs text-slate-400 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                      Solo Traveler Advisory Active
                   </div>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-800 flex-1 overflow-y-auto">
                  {/* Bio Clues */}
                  <div className="bg-slate-900 p-4 space-y-2">
                    <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                      <Icons.Leaf className="w-3 h-3 text-green-400" /> Bio-Ecology
                    </h3>
                    <ul className="text-sm space-y-1 text-slate-300">
                      {currentAnalysis.bio_clues.length > 0 ? currentAnalysis.bio_clues.slice(0, 3).map((c, i) => (
                        <li key={i} className="flex gap-2"><span className="text-green-500/50">•</span> {c}</li>
                      )) : <span className="text-slate-600 italic">No biological indicators</span>}
                    </ul>
                  </div>

                  {/* Acoustic */}
                  <div className="bg-slate-900 p-4 space-y-2">
                     <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                      <Icons.Wind className="w-3 h-3 text-cyan-400" /> Acoustic Profile
                    </h3>
                     <ul className="text-sm space-y-1 text-slate-300">
                      {currentAnalysis.acoustic_clues.length > 0 ? currentAnalysis.acoustic_clues.slice(0, 3).map((c, i) => (
                        <li key={i} className="flex gap-2"><span className="text-cyan-500/50">•</span> {c}</li>
                      )) : <span className="text-slate-600 italic">Silent environment</span>}
                    </ul>
                  </div>

                  {/* Structural */}
                  <div className="bg-slate-900 p-4 space-y-2">
                    <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                      <Icons.AlertOctagon className="w-3 h-3 text-orange-400" /> Structure
                    </h3>
                    <p className="text-sm text-slate-300 leading-snug line-clamp-4">{currentAnalysis.structural_notes}</p>
                  </div>

                  {/* Traveler Advice (New) */}
                  <div className="bg-slate-900 p-4 space-y-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10"><Icons.ShieldCheck className="w-12 h-12" /></div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 relative z-10">
                      <Icons.HelpCircle className="w-3 h-3 text-pink-400" /> Solo Advice
                    </h3>
                     <p className="text-sm text-slate-200 leading-snug relative z-10 italic">"{currentAnalysis.solo_traveler_advice}"</p>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="bg-slate-950 p-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                     <div className="bg-blue-600/20 p-2 rounded text-blue-400"><Icons.Navigation className="w-5 h-5" /></div>
                     <div>
                       <div className="text-[10px] text-blue-400 font-bold uppercase">Navigation Hint</div>
                       <div className="text-sm text-slate-200">{currentAnalysis.navigation_hint}</div>
                     </div>
                  </div>
                   <div className="flex items-start gap-3">
                     <div className="bg-emerald-600/20 p-2 rounded text-emerald-400"><Icons.Footprints className="w-5 h-5" /></div>
                     <div>
                       <div className="text-[10px] text-emerald-400 font-bold uppercase">Next Action</div>
                       <div className="text-sm text-slate-200">
                          {currentAnalysis.recommended_actions[0] || "Proceed with caution."}
                       </div>
                     </div>
                  </div>
                </div>
              </div>
            ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-slate-600 gap-4">
                 <div className="relative">
                   <Icons.Map className="w-20 h-20 opacity-10" />
                   <Icons.Compass className="w-8 h-8 opacity-20 absolute -bottom-2 -right-2 animate-pulse" />
                 </div>
                 <div className="text-center">
                   <h3 className="text-lg font-medium text-slate-500">Awaiting Input</h3>
                   <p className="text-sm max-w-xs mx-auto mt-2">Upload visual or audio data to begin environmental analysis.</p>
                 </div>
               </div>
            )}
          </div>

          {/* E. QUERY SECTION */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-lg flex flex-col gap-3 min-h-[200px]">
            <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
              <Icons.HelpCircle className="w-4 h-4 text-purple-400" /> 
              Ask SenseBridge
            </h3>
            
            {queryResult ? (
              <div className="flex-1 bg-slate-950 rounded-lg p-4 border border-slate-800 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex gap-3">
                  <div className="bg-purple-900/30 p-1.5 h-fit rounded text-purple-300"><Icons.Info className="w-4 h-4"/></div>
                  <div className="space-y-2">
                    <p className="text-slate-200 text-sm leading-relaxed">{queryResult.answer}</p>
                    <div className="text-xs text-slate-500 pt-2 border-t border-slate-800/50">
                      Reasoning: {queryResult.reasoning}
                    </div>
                  </div>
                </div>
                <button onClick={() => setQueryResult(null)} className="text-xs text-slate-500 hover:text-slate-300 mt-2 underline">Ask another question</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder={currentAnalysis ? "Ask about this location (e.g., 'Is that structure safe?', 'Where is the water?')" : "Analyze environment first..."}
                  disabled={!currentAnalysis}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
                  onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                />
                <button 
                  onClick={handleAsk}
                  disabled={!currentAnalysis || isQuerying || !userQuery.trim()}
                  className="bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-4 rounded-lg transition-colors"
                >
                  {isQuerying ? <Icons.Activity className="w-4 h-4 animate-spin"/> : <Icons.Send className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>

          {/* D. EXPLORATION LOG (Mini) */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex-1 overflow-hidden flex flex-col max-h-[200px]">
             <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2 mb-2">
              <Icons.History className="w-4 h-4" /> Log
            </h3>
            <div className="overflow-y-auto custom-scrollbar space-y-2 pr-2">
              {explorationLog.length === 0 && <div className="text-xs text-slate-600 text-center py-4">No exploration data logged.</div>}
              {explorationLog.map(log => (
                <div key={log.id} className="flex gap-3 p-2 bg-slate-950 rounded border border-slate-800 hover:border-slate-600 transition-colors">
                  {log.imageFrameUrl && <img src={log.imageFrameUrl} className="w-12 h-12 object-cover rounded bg-slate-900" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <div className="text-xs font-bold text-slate-300 truncate">{log.location_estimation || log.environment_type}</div>
                      <div className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</div>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className={`w-1.5 h-1.5 rounded-full ${getSafetyColor(log.safety_score).replace('text-', 'bg-')}`}></span>
                       <div className="text-[10px] text-slate-500 truncate">{log.environment_type}</div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;