import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Copy,
  Check,
  Code,
  Sparkles,
  Info,
  Layers,
  Heart,
  FileText,
  Save,
  Download,
  History,
  Trash2,
  Mail
} from "lucide-react";
import { jsPDF } from "jspdf";
import {
  QUESTIONS,
  computeReflectionPrompt,
  PROMPT_BANKS,
  Q2_FRAMINGS
} from "./decisionData";

type ScreenState = "landing" | "q1" | "q2" | "q3" | "result";

interface SavedReflection {
  id: string;
  date: string;
  promptText: string;
  reflectionText: string;
}

interface HistoryEntry {
  date: string;
  promptId: string;
}

export default function App() {
  const [screen, setScreen] = useState<ScreenState>("landing");
  
  // Selection states for each question
  const [answers, setAnswers] = useState<Record<string, string>>({
    Q1: "",
    Q2: "",
    Q3: ""
  });

  // Unique Session ID for the reflection session (generated upon completion)
  const [sessionId, setSessionId] = useState<string>("");

  // Server-side integration submission status
  const [submissionStatus, setSubmissionStatus] = useState<{
    state: "idle" | "submitting" | "success" | "error" | "pending";
    message: string;
  }>({ state: "idle", message: "" });

  // Automatically save and recover user reflection text locally
  const [userReflection, setUserReflection] = useState<string>(() => {
    try {
      return localStorage.getItem("clicks_clinicians_active_reflection") || "";
    } catch {
      return "";
    }
  });

  // Validation error state (shown if user tries to skip a question)
  const [validationError, setValidationError] = useState<string | null>(null);

  // Success message toast notifier
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Developer Testing Panel visibility (hidden by default)
  const [devPanelOpen, setDevPanelOpen] = useState(false);

  // Load Prompt Delivery History from LocalStorage
  const [deliveredPromptIds, setDeliveredPromptIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("clicks_clinicians_delivered_ids");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Track detailed delivery logs for the developer diagnostic panel
  const [historyLogs, setHistoryLogs] = useState<HistoryEntry[]>(() => {
    try {
      const stored = localStorage.getItem("clicks_clinicians_history_logs");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Load Saved Reflections from LocalStorage
  const [savedReflections, setSavedReflections] = useState<SavedReflection[]>(() => {
    try {
      const stored = localStorage.getItem("clicks_clinicians_saved_reflections");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // State variables for email delivery
  const [emailFormOpen, setEmailFormOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [emailConsent, setEmailConsent] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{
    state: "idle" | "submitting" | "success" | "error";
    message: string;
  }>({ state: "idle", message: "" });

  const emailFormRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Scroll form into view and focus input when form is opened
  useEffect(() => {
    if (emailFormOpen) {
      const timer = setTimeout(() => {
        emailFormRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        emailInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [emailFormOpen]);

  // Ensure Session ID is auto-populated if we are on the result page (e.g. via sandbox simulation)
  useEffect(() => {
    if (screen === "result" && !sessionId) {
      setSessionId(`session-${Math.random().toString(36).substring(2, 9)}`);
    }
  }, [screen, sessionId]);

  // Sync user reflection with local storage automatically to prevent data loss
  const handleReflectionChange = (text: string) => {
    setUserReflection(text);
    try {
      localStorage.setItem("clicks_clinicians_active_reflection", text);
    } catch (e) {
      console.error("Failed to autosave reflection text", e);
    }
  };

  // Show a notification banner helper
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Helper to handle option selection
  const handleSelectOption = (questionId: string, option: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
    setValidationError(null); // Clear error on select
  };

  // Stepper navigation helpers
  const handleBegin = () => {
    setAnswers({ Q1: "", Q2: "", Q3: "" });
    setUserReflection("");
    setSessionId("");
    setSubmissionStatus({ state: "idle", message: "" });
    try {
      localStorage.removeItem("clicks_clinicians_active_reflection");
    } catch (e) {
      console.error(e);
    }
    setValidationError(null);
    setScreen("q1");
  };

  // Compute the optimal reflection prompt based on Q1-Q3 answers and history
  const computedResult = computeReflectionPrompt(
    answers.Q1,
    answers.Q2,
    answers.Q3,
    deliveredPromptIds
  );

  const handleNext = () => {
    const currentQId = screen === "q1" ? "Q1" : screen === "q2" ? "Q2" : "Q3";
    
    if (!answers[currentQId]) {
      setValidationError("Please select an answer option to proceed.");
      return;
    }

    if (screen === "q1") {
      setScreen("q2");
    } else if (screen === "q2") {
      setScreen("q3");
    } else if (screen === "q3") {
      // Transitioning to RESULT screen: Prompt is officially delivered. Save its stable ID to history list.
      if (computedResult) {
        try {
          const updatedIds = [...deliveredPromptIds, computedResult.promptId];
          setDeliveredPromptIds(updatedIds);
          localStorage.setItem("clicks_clinicians_delivered_ids", JSON.stringify(updatedIds));

          const newLog: HistoryEntry = {
            date: new Date().toLocaleString(),
            promptId: computedResult.promptId
          };
          const updatedLogs = [newLog, ...historyLogs];
          setHistoryLogs(updatedLogs);
          localStorage.setItem("clicks_clinicians_history_logs", JSON.stringify(updatedLogs));
        } catch (e) {
          console.error("Failed to persist prompt delivery history", e);
        }
      }
      // Generate a unique session ID
      setSessionId(`session-${Math.random().toString(36).substring(2, 9)}`);
      setSubmissionStatus({ state: "idle", message: "" });
      setScreen("result");
    }
  };

  const handleBack = () => {
    setValidationError(null);
    if (screen === "q1") {
      setScreen("landing");
    } else if (screen === "q2") {
      setScreen("q1");
    } else if (screen === "q3") {
      setScreen("q2");
    } else if (screen === "result") {
      setScreen("q3");
    }
  };

  const handleRestart = () => {
    setAnswers({ Q1: "", Q2: "", Q3: "" });
    setUserReflection("");
    setValidationError(null);
    setSessionId("");
    setSubmissionStatus({ state: "idle", message: "" });
    try {
      localStorage.removeItem("clicks_clinicians_active_reflection");
    } catch (e) {
      console.error(e);
    }
    setScreen("landing");
  };

  // Future action called Submit Reflection - kept safe on server proxy, testable via developer panel
  const handleSubmitReflection = async () => {
    setSubmissionStatus({ state: "submitting", message: "Submitting..." });
    try {
      const activeSessionId = sessionId || `session-test-${Math.random().toString(36).substring(2, 9)}`;
      const activeQ1 = answers.Q1 || "Q1 Fallback Scenario (Test)";
      const activeQ2 = answers.Q2 || "Q2 Fallback Theme (Test)";
      const activeQ3 = answers.Q3 || "Q3 Fallback Relevance (Test)";
      const activePromptId = computedResult?.promptId || "test-prompt-id";
      const activePromptType = computedResult ? (computedResult.isExactMatch ? "Exact" : "Fallback") : "Fallback";

      const response = await fetch("/api/save-reflection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: activeSessionId,
          timestamp: new Date().toISOString(),
          q1Scenario: activeQ1,
          q2Theme: activeQ2,
          q3ReflectionNeed: activeQ3,
          promptId: activePromptId,
          promptType: activePromptType,
          appVersion: "1.0",
          reflectionText: userReflection || "Diagnostic test reflection content",
          email: "",
          consentToEmail: false
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.status === "success") {
        setSubmissionStatus({ state: "success", message: "Submission successful" });
        showToast("Reflection submitted successfully!");
      } else {
        setSubmissionStatus({ state: "error", message: "Submission failed" });
      }
    } catch (error: any) {
      console.error("Submission error:", error);
      setSubmissionStatus({
        state: "error",
        message: "Submission failed"
      });
    }
  };

  // Copy Prompt framing sentence and reflection prompt only (no user text)
  const handleCopyToClipboard = () => {
    if (!computedResult) return;
    const fullText = `${computedResult.q2FramingSentence} ${computedResult.promptText}`;
    navigator.clipboard.writeText(fullText).then(() => {
      showToast("Reflection prompt copied to clipboard!");
    }).catch(() => {
      showToast("Failed to copy text. Please select the text manually.");
    });
  };

  // Save Reflection and current prompt locally in the browser
  const handleSaveLocally = () => {
    if (!computedResult) return;
    const combinedPrompt = `${computedResult.q2FramingSentence} ${computedResult.promptText}`;
    const newSave: SavedReflection = {
      id: Math.random().toString(36).substring(2, 11),
      date: new Date().toLocaleString(),
      promptText: combinedPrompt,
      reflectionText: userReflection
    };

    try {
      const updatedSaves = [newSave, ...savedReflections];
      setSavedReflections(updatedSaves);
      localStorage.setItem("clicks_clinicians_saved_reflections", JSON.stringify(updatedSaves));
      showToast("Reflection saved locally to your browser.");
    } catch (e) {
      console.error(e);
      showToast("Failed to save reflection.");
    }
  };

  // Download reflection as a beautifully formatted PDF entirely client-side
  const handleDownloadPDF = () => {
    if (!computedResult) return;
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const dateString = new Date().toLocaleDateString();
      const cleanDate = new Date().toISOString().split("T")[0];

      // Draw standard clean professional header banner
      doc.setFillColor(6, 78, 59); // emerald-900: RGB (6, 78, 59)
      doc.rect(0, 0, 210, 32, "F");

      // Header Text
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("Clicks & Clinicians", 20, 16);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Session Reflection", 20, 24);

      // Section metadata
      doc.setTextColor(100, 116, 139); // slate-500
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`DATE GENERATED: ${dateString}`, 20, 42);
      doc.text(`SESSION STABLE ID: ${sessionId || "N/A"}`, 120, 42);

      // Divider line
      doc.setDrawColor(226, 232, 240); // border-slate-200
      doc.setLineWidth(0.5);
      doc.line(20, 46, 190, 46);

      // Generated Prompt Section
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Reflection Prompt Details", 20, 56);

      // Framing sentence
      doc.setFont("helvetica", "italic");
      doc.setFontSize(11);
      doc.setTextColor(51, 65, 85); // slate-700
      const splitFraming = doc.splitTextToSize(computedResult.q2FramingSentence, 170);
      doc.text(splitFraming, 20, 64);
      let currentY = 64 + (splitFraming.length * 5) + 2;

      // Actual prompt text (emphasized)
      doc.setFillColor(248, 250, 252); // slate-50
      // Draw background box for prompt
      const splitPrompt = doc.splitTextToSize(computedResult.promptText, 160);
      const boxHeight = (splitPrompt.length * 6) + 10;
      doc.rect(20, currentY, 170, boxHeight, "F");
      
      // Draw left border line
      doc.setDrawColor(6, 78, 59); // emerald-900
      doc.setLineWidth(1.5);
      doc.line(20, currentY, 20, currentY + boxHeight);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(6, 78, 59); // emerald-900
      
      // Render text inside box
      let textY = currentY + 8;
      for (let i = 0; i < splitPrompt.length; i++) {
        doc.text(splitPrompt[i], 26, textY);
        textY += 6;
      }
      currentY += boxHeight + 12;

      // Written Reflection Section
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("My Written Reflection", 20, currentY);
      currentY += 8;

      const reflectionText = userReflection.trim() ? userReflection.trim() : "(No written reflection provided)";
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85); // slate-700

      const splitReflection = doc.splitTextToSize(reflectionText, 170);
      for (let i = 0; i < splitReflection.length; i++) {
        if (currentY > 275) {
          doc.addPage();
          currentY = 20;
        }
        doc.text(splitReflection[i], 20, currentY);
        currentY += 5.5;
      }

      currentY += 15;
      if (currentY > 275) {
        doc.addPage();
        currentY = 20;
      }

      // Footer signature
      doc.setDrawColor(241, 245, 249); // slate-100
      doc.setLineWidth(0.5);
      doc.line(20, currentY, 190, currentY);
      currentY += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text("Created using the Clicks & Clinicians Session Reflection Tool.", 20, currentY);

      doc.save(`clicks-and-clinicians-reflection-${cleanDate}.pdf`);
      showToast("Reflection downloaded as PDF!");
    } catch (e) {
      console.error(e);
      showToast("Failed to generate PDF download.");
    }
  };

  // Helper for basic email structure verification
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Submit reflection for email delivery
  const handleEmailReflection = async () => {
    if (!emailAddress.trim() || !emailConsent) return;
    
    setEmailStatus({ state: "submitting", message: "Sending..." });
    try {
      const activeSessionId = sessionId || `session-email-${Math.random().toString(36).substring(2, 9)}`;
      const activeQ1 = answers.Q1 || "Q1 Fallback Scenario (Test)";
      const activeQ2 = answers.Q2 || "Q2 Fallback Theme (Test)";
      const activeQ3 = answers.Q3 || "Q3 Fallback Relevance (Test)";
      const activePromptId = computedResult?.promptId || "test-prompt-id";
      const activePromptType = computedResult ? (computedResult.isExactMatch ? "Exact" : "Fallback") : "Fallback";

      const response = await fetch("/api/save-reflection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: activeSessionId,
          timestamp: new Date().toISOString(),
          q1Scenario: activeQ1,
          q2Theme: activeQ2,
          q3ReflectionNeed: activeQ3,
          promptId: activePromptId,
          promptType: activePromptType,
          appVersion: "1.0",
          reflectionText: userReflection || "(No written reflection provided)",
          email: emailAddress.trim(),
          consentToEmail: true,
          framingSentence: computedResult?.q2FramingSentence || "",
          q2FramingSentence: computedResult?.q2FramingSentence || "",
          promptText: computedResult?.promptText || ""
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.status === "success") {
        setEmailStatus({ state: "success", message: "Reflection emailed successfully!" });
        showToast("Reflection sent to your email!");
      } else {
        setEmailStatus({ state: "error", message: "Failed to send email. Verification endpoint rejected submission." });
      }
    } catch (error: any) {
      console.error("Email submission error:", error);
      setEmailStatus({
        state: "error",
        message: "Failed to send email. Server or connection error."
      });
    }
  };

  // Clear all saved reflections
  const handleClearSavedReflections = () => {
    if (confirm("Are you sure you want to delete all saved reflections? This cannot be undone.")) {
      setSavedReflections([]);
      localStorage.removeItem("clicks_clinicians_saved_reflections");
      showToast("All saved reflections have been cleared.");
    }
  };

  // Clear prompt history
  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear your prompt delivery history?")) {
      setDeliveredPromptIds([]);
      setHistoryLogs([]);
      localStorage.removeItem("clicks_clinicians_delivered_ids");
      localStorage.removeItem("clicks_clinicians_history_logs");
      showToast("Prompt history list cleared.");
    }
  };

  // Calculate current progress percentage
  const getProgressPercentage = () => {
    switch (screen) {
      case "q1": return 33;
      case "q2": return 66;
      case "q3": return 100;
      case "result": return 100;
      default: return 0;
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between font-sans selection:bg-emerald-100 selection:text-emerald-950 transition-colors duration-300">
      
      {/* Calm, Minimalist Header Banner */}
      <header className="border-b border-stone-200/60 bg-white/70 backdrop-blur-md sticky top-0 z-40 px-4 py-4 sm:px-6 md:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-800/10 flex items-center justify-center text-emerald-800">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-emerald-800/80 uppercase block font-bold">
                Clicks & Clinicians
              </span>
              <h1 className="text-sm font-semibold tracking-tight text-stone-800">
                Session Reflection
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Developer Testing Panel (Rendered as a plain static block directly underneath the header/button) */}
      {devPanelOpen && (
        <div id="dev-panel" className="max-w-4xl mx-auto w-full px-4 sm:px-6 md:px-8 mt-4 relative z-50">
          <div className="bg-stone-900 text-stone-100 rounded-2xl p-6 shadow-xl border border-stone-800 space-y-6 font-mono text-xs">
            {/* Temporary developer-only label */}
            <div className="bg-emerald-950 border border-emerald-800 text-emerald-400 font-bold px-4 py-2 rounded text-center text-sm">
              Developer Panel Open
            </div>

            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center space-x-2">
                <Code className="h-4 w-4 text-emerald-400" />
                <span className="font-bold uppercase tracking-wider text-emerald-400 text-[10px]">
                  Clinical Matrix Diagnostic Testing Panel (Hidden in normal use)
                </span>
              </div>
              <span className="text-[9px] bg-stone-800 text-stone-400 px-2 py-0.5 rounded font-bold">
                Status: Deterministic-Rule Core
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Section A: Computed Routing Variables */}
              <div className="space-y-3.5 bg-stone-950 p-4 rounded-xl border border-stone-800">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-800 pb-1.5 flex items-center justify-between">
                  <span>Active Decision Variables</span>
                  <Layers className="h-3.5 w-3.5 text-stone-500" />
                </h4>
                
                <div className="space-y-2.5">
                  <div>
                    <span className="text-stone-500 block text-[9px] uppercase font-bold">Selected Question 3 Category (Primary):</span>
                    <span className="text-stone-200 text-sm font-semibold">
                      {answers.Q3 ? (
                        <>
                          Bank {PROMPT_BANKS[answers.Q3]?.id}: {PROMPT_BANKS[answers.Q3]?.name}
                        </>
                      ) : (
                        <em className="text-stone-600">None selected</em>
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-500 block text-[9px] uppercase font-bold">Routing Result (Q1 Scenario Match):</span>
                    {answers.Q1 && answers.Q3 ? (
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          computedResult?.isExactMatch 
                            ? "bg-emerald-950/80 text-emerald-400 border border-emerald-900" 
                            : "bg-amber-950/80 text-amber-400 border border-amber-900"
                        }`}>
                          {computedResult?.isExactMatch ? "EXACT MATCH (Green Row)" : "FALLBACK PROMPT (Pink Row)"}
                        </span>
                      </div>
                    ) : (
                      <em className="text-stone-600">Awaiting Q1 & Q3 selections</em>
                    )}
                  </div>

                  <div>
                    <span className="text-stone-500 block text-[9px] uppercase font-bold">Selected Question 2 Framing Sentence:</span>
                    <span className="text-stone-300 italic block mt-0.5 leading-relaxed">
                      {answers.Q2 ? (
                        `"${Q2_FRAMINGS[answers.Q2]}"`
                      ) : (
                        <em className="text-stone-600">None selected</em>
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-500 block text-[9px] uppercase font-bold">Stable Prompt ID:</span>
                    <span className="text-amber-400 font-semibold font-mono block mt-0.5">
                      {computedResult ? computedResult.promptId : <em className="text-stone-600">None calculated yet</em>}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section B: Sandbox Matrix Simulator */}
              <div className="space-y-3 bg-stone-950 p-4 rounded-xl border border-stone-800">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-800 pb-1.5 flex items-center justify-between">
                  <span>Diagnostic Sandbox Simulator</span>
                  <Sparkles className="h-3.5 w-3.5 text-stone-500" />
                </h4>

                <p className="text-[10px] text-stone-500 leading-normal">
                  Directly simulate any of the 720 possible clinical matrix configurations.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[9px] text-stone-500 uppercase font-bold mb-1">
                      Q1 Scenario Selection (Secondary):
                    </label>
                    <select
                      value={answers.Q1}
                      onChange={(e) => handleSelectOption("Q1", e.target.value)}
                      className="w-full bg-stone-900 border border-stone-800 rounded p-1.5 text-stone-200 focus:outline-none focus:border-emerald-700 font-mono text-xs"
                    >
                      <option value="">-- Select Scenario --</option>
                      {QUESTIONS[0].options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] text-stone-500 uppercase font-bold mb-1">
                      Q2 Focus Theme (Context modifier):
                    </label>
                    <select
                      value={answers.Q2}
                      onChange={(e) => handleSelectOption("Q2", e.target.value)}
                      className="w-full bg-stone-900 border border-stone-800 rounded p-1.5 text-stone-200 focus:outline-none focus:border-emerald-700 font-mono text-xs"
                    >
                      <option value="">-- Select Theme --</option>
                      {QUESTIONS[1].options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] text-stone-500 uppercase font-bold mb-1">
                      Q3 Relevance Area (Primary router):
                    </label>
                    <select
                      value={answers.Q3}
                      onChange={(e) => handleSelectOption("Q3", e.target.value)}
                      className="w-full bg-stone-900 border border-stone-800 rounded p-1.5 text-stone-200 focus:outline-none focus:border-emerald-700 font-mono text-xs"
                    >
                      <option value="">-- Select Relevance --</option>
                      {QUESTIONS[2].options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section C: Google Sheets Integration Diagnostics */}
              <div className="md:col-span-2 space-y-3 bg-stone-950 p-4 rounded-xl border border-stone-800">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-800 pb-1.5 flex items-center justify-between">
                  <span>Integration Diagnostics</span>
                  <Save className="h-3.5 w-3.5 text-stone-500" />
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div>
                      <span className="text-stone-500 block text-[9px] uppercase font-bold">Session ID (Durable):</span>
                      <span className="text-amber-400 font-mono text-xs block mt-0.5">
                        {sessionId || <em className="text-stone-600">Generated on completion</em>}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-500 block text-[9px] uppercase font-bold">Local Storage Status:</span>
                      <span className="text-emerald-400 font-mono text-[10px] block mt-0.5">
                        ✓ Autosave Active ({userReflection.trim().length} chars)
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <span className="text-stone-500 block text-[9px] uppercase font-bold">Verification Actions:</span>
                    <div className="space-y-2">
                      <button
                        onClick={handleSubmitReflection}
                        disabled={submissionStatus.state === "submitting"}
                        className="w-full inline-flex items-center justify-center space-x-1 px-3 py-1.5 rounded bg-emerald-800 hover:bg-emerald-700 disabled:bg-stone-800 text-white font-bold text-[10px] transition cursor-pointer"
                      >
                        <span>Submit Reflection</span>
                      </button>
                      
                      <div className="text-[10px] leading-normal">
                        <span className="text-stone-500 font-bold">Status: </span>
                        <span className={`font-semibold ${
                          submissionStatus.state === "success" ? "text-emerald-400" :
                          submissionStatus.state === "error" ? "text-rose-400" :
                          submissionStatus.state === "pending" ? "text-amber-400" : "text-stone-400"
                        }`}>
                          {submissionStatus.state === "idle" && "Ready for diagnostic submission"}
                          {submissionStatus.state === "submitting" && "Transmitting..."}
                          {submissionStatus.state === "success" && "Submission successful"}
                          {submissionStatus.state === "pending" && "Pending setup"}
                          {submissionStatus.state === "error" && "Submission failed"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Delivery History List (Requirement 5) */}
            <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                <div className="flex items-center space-x-2">
                  <History className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="font-bold text-[10px] text-stone-300 uppercase">LocalStorage Delivery Prompt History</span>
                </div>
                {deliveredPromptIds.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="text-[9px] text-stone-500 hover:text-rose-400 transition flex items-center space-x-1 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Clear Delivery History</span>
                  </button>
                )}
              </div>

              {historyLogs.length === 0 ? (
                <p className="text-[10px] text-stone-600">No prompt deliveries recorded yet in this browser session.</p>
              ) : (
                <div className="max-h-32 overflow-y-auto space-y-1 pr-1 text-[10px] text-stone-400 font-mono">
                  {historyLogs.map((entry, idx) => (
                    <div key={idx} className="flex justify-between py-0.5 border-b border-stone-900">
                      <span>{entry.date}</span>
                      <span className="text-emerald-400 font-semibold">{entry.promptId}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live State JSON Payload */}
            <div className="space-y-2">
              <span className="text-stone-500 block text-[9px] uppercase font-bold">Active Memory JSON Payload:</span>
              <pre className="bg-stone-950 p-3 rounded-xl border border-stone-800 text-[10px] text-stone-400 overflow-x-auto leading-normal">
                {JSON.stringify({ answers, computedResult, deliveredPromptIds }, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification Banner */}
      <AnimatePresence>
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full px-4">
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="bg-stone-900 text-stone-100 p-4 rounded-xl shadow-xl border border-stone-800 flex items-center space-x-3 text-xs"
            >
              <Check className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">{toastMessage}</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Container Layout */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:px-6 md:py-12 flex flex-col justify-center">
        <div className="grid grid-cols-1 gap-8">
          
          <AnimatePresence mode="wait">
            {/* 1. Landing Screen */}
            {screen === "landing" && (
              <motion.div
                key="landing"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="bg-white border border-stone-200/80 rounded-2xl p-6 sm:p-10 shadow-[0_4px_20px_-4px_rgba(45,54,49,0.04)]"
              >
                <div className="max-w-2xl mx-auto text-center space-y-8">
                  <div className="inline-flex items-center justify-center space-x-2 px-3 py-1 bg-stone-100 rounded-full text-stone-600 text-xs font-semibold">
                    <Heart className="h-3.5 w-3.5 text-emerald-700" />
                    <span className="tracking-wide">Clinician Reflective Practice</span>
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-emerald-950 font-normal leading-tight tracking-tight">
                      Clicks & Clinicians <br />
                      <span className="font-sans text-2xl sm:text-3xl font-bold block mt-1 text-stone-800">
                        Session Reflection
                      </span>
                    </h2>
                    
                    <p className="text-stone-600 leading-relaxed text-sm sm:text-base max-w-lg mx-auto">
                      A quiet, dedicated utility designed to convert daily clinical interactions, professional workflows, and learning encounters into focused growth.
                    </p>
                  </div>

                  {/* Clean Simplified Statement */}
                  <div className="max-w-xl mx-auto pt-6 border-t border-stone-100">
                    <p className="text-emerald-950 font-medium text-sm sm:text-base leading-relaxed text-center px-4">
                      “This reflection tool helps you identify a meaningful question, idea, or tension from today’s discussion and carry it into your professional practice.”
                    </p>
                  </div>

                  <div className="pt-6">
                    {/* Primary Button styled as active solid on page load */}
                    <button
                      onClick={handleBegin}
                      className="inline-flex items-center justify-center space-x-2 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold px-8 py-4 rounded-xl shadow-md shadow-emerald-800/15 hover:shadow-emerald-800/25 transition-all duration-200 active:scale-95 cursor-pointer text-base tracking-wide"
                    >
                      <span>Begin Session Reflection</span>
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. Questions 1, 2, 3 */}
            {(screen === "q1" || screen === "q2" || screen === "q3") && (
              <motion.div
                key={screen}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.28 }}
                className="bg-white border border-stone-200/80 rounded-2xl p-5 sm:p-8 md:p-10 shadow-[0_4px_20px_-4px_rgba(45,54,49,0.04)]"
              >
                {/* Stepper Header Progress */}
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center text-xs text-stone-500 font-semibold">
                    <span className="uppercase tracking-widest text-emerald-800 font-bold">
                      Question {screen === "q1" ? "1" : screen === "q2" ? "2" : "3"} of 3
                    </span>
                    <span>{getProgressPercentage()}% Completed</span>
                  </div>
                  <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-emerald-800"
                      initial={{ width: 0 }}
                      animate={{ width: `${getProgressPercentage()}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                {/* Question text only, no developer routing subtitles */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-serif text-emerald-950 font-semibold tracking-tight leading-snug">
                      {screen === "q1" && QUESTIONS[0].text}
                      {screen === "q2" && QUESTIONS[1].text}
                      {screen === "q3" && QUESTIONS[2].text}
                    </h3>
                  </div>

                  {/* Radio options grid */}
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
                    {(screen === "q1" ? QUESTIONS[0].options : screen === "q2" ? QUESTIONS[1].options : QUESTIONS[2].options).map((option) => {
                      const currentQId = screen === "q1" ? "Q1" : screen === "q2" ? "Q2" : "Q3";
                      const isSelected = answers[currentQId] === option;
                      
                      return (
                        <button
                          key={option}
                          onClick={() => handleSelectOption(currentQId, option)}
                          className={`group text-left p-4 rounded-xl border transition-all duration-150 cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? "bg-emerald-50/60 border-emerald-800/80 text-emerald-950 shadow-sm font-semibold"
                              : "bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50/50 text-stone-700"
                          }`}
                        >
                          <span className="text-sm leading-relaxed pr-3">{option}</span>
                          <div className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? "border-emerald-800 bg-emerald-800 text-white"
                              : "border-stone-300 group-hover:border-stone-400"
                          }`}>
                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Validation feedback notice */}
                  {validationError && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center space-x-2 text-amber-800 bg-amber-50/80 border border-amber-200/50 p-3.5 rounded-xl text-xs font-semibold"
                    >
                      <Info className="h-4 w-4 shrink-0 text-amber-700" />
                      <span>{validationError}</span>
                    </motion.div>
                  )}

                  {/* Action Controls */}
                  <div className="pt-6 border-t border-stone-100 flex items-center justify-between">
                    <button
                      onClick={handleBack}
                      className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-lg border border-stone-200 text-stone-600 hover:text-stone-800 hover:bg-stone-50 text-sm font-semibold transition duration-150 cursor-pointer"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Back</span>
                    </button>

                    <button
                      onClick={handleNext}
                      className={`inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150 cursor-pointer ${
                        answers[screen === "q1" ? "Q1" : screen === "q2" ? "Q2" : "Q3"]
                          ? "bg-emerald-800 text-white hover:bg-emerald-900 shadow-sm"
                          : "bg-stone-100 text-stone-400 cursor-not-allowed"
                      }`}
                    >
                      <span>
                        {screen === "q3" ? "Create My Reflection Prompt" : "Next Question"}
                      </span>
                      {screen !== "q3" && <ArrowRight className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3. Result Screen */}
            {screen === "result" && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.35 }}
                className="space-y-6"
              >
                {/* Visual Reflection Prompt Card */}
                <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
                  
                  {/* Clean Clinician Centred Header */}
                  <div className="bg-emerald-900 text-emerald-50 px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <BookOpen className="h-5 w-5 text-emerald-300" />
                      <span className="font-serif tracking-tight text-base sm:text-lg font-medium">Reflection Guide</span>
                    </div>
                  </div>

                  <div className="p-6 sm:p-10 space-y-8">
                    {computedResult ? (
                      <div className="space-y-8">
                        
                        {/* Unified, accessible, high-contrast serif typography prompt */}
                        <div className="space-y-4 max-w-2xl">
                          <p className="text-stone-800 text-lg sm:text-xl font-serif font-normal leading-relaxed">
                            {computedResult.q2FramingSentence}
                          </p>
                          <p className="text-emerald-950 text-2xl sm:text-3xl font-serif font-semibold leading-relaxed tracking-tight">
                            {computedResult.promptText}
                          </p>
                        </div>

                        {/* Optional Reflection Space */}
                        <div className="space-y-2.5 pt-6 border-t border-stone-100">
                          <div className="flex justify-between items-center">
                            <label htmlFor="user-reflection" className="block text-xs font-bold uppercase tracking-wider text-stone-500 font-sans">
                              Your Reflection
                            </label>
                            <span className="text-xs text-stone-400 font-medium italic">Optional</span>
                          </div>
                          
                          <textarea
                            id="user-reflection"
                            rows={7}
                            value={userReflection}
                            onChange={(e) => handleReflectionChange(e.target.value)}
                            placeholder="Type your thoughts, clinical insights, or observations here..."
                            className="w-full rounded-xl border border-stone-200 p-4 text-sm text-stone-800 placeholder-stone-400 focus:border-emerald-800 focus:ring-1 focus:ring-emerald-850 bg-stone-50/20 focus:bg-white transition-all outline-none resize-y leading-relaxed font-sans"
                          />
                        </div>

                      </div>
                    ) : (
                      <div className="text-center py-8 text-amber-800 bg-amber-50 rounded-lg p-4 border border-amber-200">
                        <p className="text-sm font-semibold">Unable to load reflection prompt.</p>
                        <p className="text-xs text-stone-500 mt-1">Please restart the generator to select answers.</p>
                      </div>
                    )}

                    {/* Clean Action Controls */}
                    {computedResult && (
                      <div className="space-y-4 pt-6 border-t border-stone-100">
                        <div className="flex flex-col sm:flex-row gap-3">
                          
                          {/* Copy Prompt Text Only */}
                          <button
                            onClick={handleCopyToClipboard}
                            className="inline-flex items-center justify-center space-x-1.5 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 font-semibold px-4 py-3 rounded-xl text-xs transition cursor-pointer"
                            title="Copy framing sentence and reflection prompt"
                          >
                            <Copy className="h-4 w-4 text-stone-500" />
                            <span>Copy Prompt</span>
                          </button>

                          {/* Save & Email Button Group */}
                          <div className="flex flex-col gap-2 shrink-0">
                            {/* Save Reflection Locally */}
                            <button
                              onClick={handleSaveLocally}
                              className="inline-flex items-center justify-center space-x-1.5 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 font-semibold px-4 py-3 rounded-xl text-xs transition cursor-pointer w-full min-w-[170px]"
                              title="Save this entry inside your local browser tab history"
                            >
                              <Save className="h-4 w-4 text-stone-500" />
                              <span>Save Reflection</span>
                            </button>

                            {/* Email Me My Reflection */}
                            <button
                              onClick={() => {
                                setEmailFormOpen(true);
                                setEmailStatus({ state: "idle", message: "" });
                              }}
                              className="inline-flex items-center justify-center space-x-1.5 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 font-semibold px-4 py-3 rounded-xl text-xs transition cursor-pointer w-full min-w-[170px]"
                              title="Email a copy of this reflection to yourself"
                            >
                              <Mail className="h-4 w-4 text-stone-500" />
                              <span>Email Me My Reflection</span>
                            </button>

                            {/* Inline Email Delivery Form - Placed immediately underneath the button */}
                            {emailFormOpen && (
                              <div ref={emailFormRef} className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3 w-full sm:w-[320px] md:w-[360px] self-start mt-2">
                                <h4 className="text-xs font-semibold text-emerald-950">
                                  Would you like a copy emailed to you?
                                </h4>
                                
                                <div className="space-y-2.5">
                                  <div>
                                    <label htmlFor="email-address" className="sr-only">Email Address</label>
                                    <input
                                      ref={emailInputRef}
                                      id="email-address"
                                      type="email"
                                      value={emailAddress}
                                      onChange={(e) => setEmailAddress(e.target.value)}
                                      placeholder="your.email@example.com"
                                      className="w-full rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:border-emerald-800 focus:ring-1 focus:ring-emerald-850 bg-white transition-all outline-none"
                                    />
                                  </div>

                                  <label className="flex items-start space-x-2 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={emailConsent}
                                      onChange={(e) => setEmailConsent(e.target.checked)}
                                      className="mt-0.5 h-3.5 w-3.5 rounded border-stone-300 text-emerald-800 focus:ring-emerald-850 cursor-pointer"
                                    />
                                    <span className="text-[10px] leading-normal text-stone-600">
                                      I consent to Clicks & Clinicians using this email address only to send me this reflection.
                                    </span>
                                  </label>
                                </div>

                                {emailStatus.message && (
                                  <div className={`text-[11px] font-medium p-2 rounded ${
                                    emailStatus.state === "success" 
                                      ? "bg-emerald-50 text-emerald-800 border border-emerald-100" 
                                      : emailStatus.state === "error" 
                                      ? "bg-rose-50 text-rose-800 border border-rose-100" 
                                      : "bg-amber-50 text-amber-800 border border-amber-100"
                                  }`}>
                                    {emailStatus.message}
                                  </div>
                                )}

                                <div className="flex items-center space-x-3 pt-1">
                                  <button
                                    type="button"
                                    onClick={handleEmailReflection}
                                    disabled={!isValidEmail(emailAddress) || !emailConsent || emailStatus.state === "submitting"}
                                    className="inline-flex items-center justify-center px-3 py-1.5 bg-emerald-800 text-white rounded-lg text-[11px] font-semibold hover:bg-emerald-900 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed transition cursor-pointer"
                                  >
                                    {emailStatus.state === "submitting" ? "Sending..." : "Send My Reflection"}
                                  </button>
                                  
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEmailFormOpen(false);
                                      setEmailAddress("");
                                      setEmailConsent(false);
                                      setEmailStatus({ state: "idle", message: "" });
                                    }}
                                    className="text-[11px] text-stone-500 hover:text-stone-700 font-medium transition cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Download Reflection as PDF */}
                          <button
                            onClick={handleDownloadPDF}
                            className="inline-flex items-center justify-center space-x-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold px-5 py-3 rounded-xl text-xs transition shadow-sm cursor-pointer sm:self-start"
                            title="Download reflection report as PDF"
                          >
                            <Download className="h-4 w-4" />
                            <span>Download as PDF</span>
                          </button>
                          
                          <div className="sm:ml-auto sm:self-start">
                            <button
                              onClick={handleRestart}
                              className="w-full inline-flex items-center justify-center space-x-1.5 border border-stone-200 text-stone-600 hover:text-stone-800 hover:bg-stone-100 font-semibold px-5 py-3 rounded-xl text-xs transition cursor-pointer"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span>Start Again</span>
                            </button>
                          </div>

                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Local Saved Reflections Registry (shown only if records exist) */}
                {savedReflections.length > 0 && (
                  <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-emerald-850" />
                        <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider font-sans">Saved Reflections ({savedReflections.length})</h4>
                      </div>
                      <button
                        onClick={handleClearSavedReflections}
                        className="text-[10px] text-stone-400 hover:text-rose-600 transition flex items-center space-x-1 font-semibold cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Clear All Saves</span>
                      </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-3 pr-1.5 scrollbar-thin">
                      {savedReflections.map((save) => (
                        <div key={save.id} className="bg-stone-50 p-4 rounded-lg border border-stone-100 text-xs space-y-2">
                          <div className="flex justify-between text-stone-400 font-semibold text-[10px]">
                            <span>{save.date}</span>
                          </div>
                          <p className="text-stone-800 font-serif text-sm leading-relaxed">{save.promptText}</p>
                          {save.reflectionText.trim() && (
                            <div className="bg-white p-3 rounded border border-stone-200/50 text-stone-600 leading-relaxed font-sans">
                              {save.reflectionText}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quiet Clinician Guidelines */}
                <div className="bg-stone-50 border border-stone-200 p-5 rounded-2xl flex items-start space-x-3 text-stone-600">
                  <Info className="h-5 w-5 text-stone-400 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-stone-800 uppercase tracking-wider">How to use this reflection</h4>
                    <p className="text-xs leading-relaxed text-stone-500">
                      Copy, save, or download this prompt to format your CPD portfolio files or supervision logs. Focus on answering the prompt questions openly to enhance your professional development.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

         </div>
       </main>

      {/* Footer */}
      <footer className="py-6 border-t border-stone-200/60 bg-white/40 text-center text-[11px] text-stone-400 px-4">
        <div className="max-w-4xl mx-auto space-y-1.5 font-medium">
          <p>© 2026 Clicks & Clinicians. All rights reserved.</p>
          <p className="leading-normal max-w-md mx-auto">
            This tool computes session reflection cues through deterministic, rule-based clinical decision matrices. No clinical logs are sent to remote servers.
          </p>
        </div>
      </footer>

    </div>
  );
}
