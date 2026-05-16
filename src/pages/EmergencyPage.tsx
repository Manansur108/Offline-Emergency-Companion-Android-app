import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Droplets,
  EyeOff,
  Flame,
  HeartPulse,
  Loader2,
  PhoneCall,
  RotateCcw,
  Search,
  ShieldAlert,
  Siren,
  Timer,
  Volume2,
  Wind,
  X,
  Users,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import type { EmergencyProtocol, EmergencyStep, EmergencyType } from '../types/emergency';
import { TOP_911_EMERGENCIES, findTop911Emergency, searchTop911Emergencies, type Top911Emergency } from '../data/top911Emergencies';
import {
  getBehaviorNudgeForProtocol,
  getBehaviorNudgeForTop911,
  type BehaviorNudge,
} from '../data/emergencyBehavior';
import {
  classifyEmergency,
  getAlternativeEmergencyGuidance,
  resolveProtocolForInput,
} from '../services/emergencyEngine';
import {
  EMERGENCY_LANGUAGES,
  classifyEmergencyWithAi,
  generateDispatcherBriefWithAi,
  generateInteractiveHelperWithAi,
  getEmergencyLanguage,
  getConstrainedAlternativeGuidanceWithAi,
  isAiModelReady,
  translateEmergencyStepWithAi,
  type EmergencyLanguageCode,
  type EmergencyHtmlHelper,
  type TranslatedStep,
} from '../services/emergencyAi';
import { VoiceIO } from '../plugins/voiceIO';
import { HapticsBridge } from '../plugins/haptics';
import { OfflineModel, type OfflineModelStatus } from '../plugins/offlineModel';

type EmergencyPhase = 'input' | 'guide' | 'aftercare';
type EmergencyLocationState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  note: string;
  error?: string;
  copied?: boolean;
};

const quickActions: Array<{
  type: EmergencyType;
  title: string;
  detail: string;
  icon: typeof HeartPulse;
  tone: string;
}> = [
  {
    type: 'cardiac_arrest',
    title: 'Not breathing',
    detail: 'Collapsed or unconscious',
    icon: HeartPulse,
    tone: 'bg-rose-600 text-white shadow-rose-600/30',
  },
  {
    type: 'choking',
    title: 'Choking',
    detail: 'Cannot talk or cough',
    icon: Wind,
    tone: 'bg-orange-500 text-white shadow-orange-500/25',
  },
  {
    type: 'bleeding',
    title: 'Severe bleeding',
    detail: 'Blood will not stop',
    icon: Droplets,
    tone: 'bg-red-700 text-white shadow-red-700/25',
  },
  {
    type: 'unsafe_scene',
    title: 'Cannot speak',
    detail: 'Weapon, threat, unsafe',
    icon: EyeOff,
    tone: 'bg-slate-950 text-white shadow-slate-950/25',
  },
  {
    type: 'trauma',
    title: 'Crash or fall',
    detail: 'Do not move them',
    icon: Siren,
    tone: 'bg-blue-700 text-white shadow-blue-700/25',
  },
  {
    type: 'fire',
    title: 'Fire or smoke',
    detail: 'Evacuate now',
    icon: Flame,
    tone: 'bg-amber-500 text-white shadow-amber-500/25',
  },
  {
    type: 'chemical',
    title: 'Gas or chemical',
    detail: 'Fumes, spill, exposure',
    icon: AlertTriangle,
    tone: 'bg-yellow-500 text-slate-950 shadow-yellow-500/20',
  },
  {
    type: 'unknown',
    title: 'Not sure',
    detail: 'Start with safest step',
    icon: ShieldAlert,
    tone: 'bg-slate-900 text-white shadow-slate-900/20',
  },
];

const quickChecks = [
  'Move away from danger if you can.',
  'Call 911 if life is at risk.',
  'Put the phone on speaker.',
];

const CPR_RATE_BPM = 110;
const CPR_BEAT_MS = Math.round(60_000 / CPR_RATE_BPM);
const CPR_COACH_INTRO =
  'Place the heel of one hand on the center of the chest. Put the other hand on top. Push hard and fast, 100 to 120 times per minute, at least 2 inches deep. Let the chest rise fully between pushes. Follow the beat. Push. Release.';
const CPR_COACH_PROMPTS = [
  'Keep pushing hard and fast. Let the chest rise fully.',
  'Stay on the beat. Push in the center of the chest.',
  'If someone else is there, ask them to get an AED and prepare to switch.',
  'Do not stop compressions unless the person breathes normally, an AED tells you to pause, or help takes over.',
];

export function EmergencyPage() {
  const [phase, setPhase] = useState<EmergencyPhase>('input');
  const [protocol, setProtocol] = useState<EmergencyProtocol | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [routeQuery, setRouteQuery] = useState('');
  const [routeSummary, setRouteSummary] = useState('');
  const [researchQuery, setResearchQuery] = useState('');
  const [modelStatus, setModelStatus] = useState<OfflineModelStatus | null>(null);
  const [dispatcherBrief, setDispatcherBrief] = useState('');
  const [behaviorNudge, setBehaviorNudge] = useState<BehaviorNudge | null>(null);
  const [locationState, setLocationState] = useState<EmergencyLocationState>({ status: 'idle', note: '' });
  const [completedRoles, setCompletedRoles] = useState<Record<string, boolean>>({});
  const [completedEmergencyTitle, setCompletedEmergencyTitle] = useState('');
  const [pressureStartedAt, setPressureStartedAt] = useState<number | null>(null);
  const [tourniquetAppliedAt, setTourniquetAppliedAt] = useState<number | null>(null);
  const [timerNow, setTimerNow] = useState(() => Date.now());
  const [selectedLanguage, setSelectedLanguage] = useState<EmergencyLanguageCode>('en');
  const [translatedStep, setTranslatedStep] = useState<TranslatedStep | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [compressionCount, setCompressionCount] = useState(0);
  const [compressionElapsedSeconds, setCompressionElapsedSeconds] = useState(0);
  const [compressionBeat, setCompressionBeat] = useState(0);
  const [htmlHelperOpen, setHtmlHelperOpen] = useState(false);
  const [htmlHelper, setHtmlHelper] = useState<EmergencyHtmlHelper | null>(null);
  const [isGeneratingHelper, setIsGeneratingHelper] = useState(false);
  const coachPromptIndexRef = useRef(0);

  const currentStep = protocol?.steps[currentStepIndex];
  const isLastStep = Boolean(protocol && currentStepIndex >= protocol.steps.length - 1);
  const isCompressionCoachActive = isCprCompressionStep(protocol, currentStep);
  const isSilentGuide = protocol?.type === 'unsafe_scene';
  const modelMode = getModelMode(modelStatus);
  const aiReady = isAiModelReady(modelStatus);
  const visibleStep = currentStep;
  const helperRoles = useMemo(() => getHelperRoles(protocol, behaviorNudge), [behaviorNudge, protocol]);
  const common911Matches = useMemo(() => searchTop911Emergencies(researchQuery, 8), [researchQuery]);
  const progress = useMemo(() => {
    if (!protocol) return 0;
    return Math.round(((currentStepIndex + 1) / protocol.steps.length) * 100);
  }, [currentStepIndex, protocol]);

  useEffect(() => {
    if (!isCompressionCoachActive) {
      return;
    }

    coachPromptIndexRef.current = 0;
    const coachLanguage = selectedLanguage === 'en' || translatedStep ? selectedLanguage : 'en';
    const intro = selectedLanguage !== 'en' && translatedStep
      ? [translatedStep.instruction, translatedStep.detail].filter(Boolean).join(' ')
      : currentStep?.detail ? `${currentStep.detail} Follow the beat. Push. Release.` : CPR_COACH_INTRO;
    VoiceIO.speak({ text: intro, language: getSpeechLanguage(coachLanguage), rate: 0.98 }).catch(() => undefined);

    const beatInterval = window.setInterval(() => {
      setCompressionCount((count) => count + 1);
      setCompressionBeat((beat) => beat + 1);
      HapticsBridge.impact({ style: 'medium' }).catch(() => undefined);
    }, CPR_BEAT_MS);

    const timerInterval = window.setInterval(() => {
      setCompressionElapsedSeconds((seconds) => seconds + 1);
    }, 1000);

    const voiceInterval = window.setInterval(() => {
      const prompt = selectedLanguage !== 'en' && translatedStep
        ? translatedStep.instruction
        : CPR_COACH_PROMPTS[coachPromptIndexRef.current % CPR_COACH_PROMPTS.length];
      coachPromptIndexRef.current += 1;
      VoiceIO.speak({ text: prompt, language: getSpeechLanguage(coachLanguage), rate: 0.98 }).catch(() => undefined);
    }, 20_000);

    return () => {
      window.clearInterval(beatInterval);
      window.clearInterval(timerInterval);
      window.clearInterval(voiceInterval);
      VoiceIO.stopSpeaking().catch(() => undefined);
    };
  }, [currentStep?.detail, isCompressionCoachActive, selectedLanguage, translatedStep]);

  useEffect(() => {
    if (!pressureStartedAt && !tourniquetAppliedAt) return;

    const timer = window.setInterval(() => {
      setTimerNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [pressureStartedAt, tourniquetAppliedAt]);

  useEffect(() => {
    let isMounted = true;

    OfflineModel.getStatus()
      .then((nextStatus) => {
        if (isMounted) {
          setModelStatus(nextStatus);
        }
      })
      .catch(() => {
        if (isMounted) {
          setModelStatus(null);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!currentStep || selectedLanguage === 'en' || !aiReady) {
      return;
    }

    const translateTimeout = window.setTimeout(() => {
      setIsTranslating(true);
      translateEmergencyStepWithAi(currentStep, selectedLanguage)
        .then((translation) => {
          if (isMounted) {
            setTranslatedStep(translation);
            setHtmlHelper(
              translation && protocol
                ? createLanguageHtmlHelper(protocol, currentStep, translation, selectedLanguage)
                : createLanguageFallbackHtmlHelper(currentStep, selectedLanguage),
            );
            setHtmlHelperOpen(true);
            if (translation && protocol?.type !== 'unsafe_scene') {
              VoiceIO.speak({
                text: [translation.instruction, translation.detail].filter(Boolean).join(' '),
                language: getSpeechLanguage(selectedLanguage),
                rate: 0.94,
              }).catch(() => {
                  setStatusMessage('Text translated, but speech for this language is not installed on this device.');
              });
            } else if (!translation) {
              setStatusMessage('Translation failed. Showing English text, but not speaking it with a foreign-language voice.');
            }
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsTranslating(false);
          }
        });
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(translateTimeout);
    };
  }, [aiReady, currentStep, protocol, selectedLanguage]);

  async function routeEmergencyFromSearch() {
    const description = routeQuery.trim();
    if (!description || isProcessing) return;

    setIsProcessing(true);
    setRouteSummary('');
    setStatusMessage(aiReady ? 'Gemma is routing this emergency...' : 'Routing with offline rules...');
    try {
      const safetyTriage = assessPersonalSafetyTriage(description);
      if (aiReady) {
        const aiRoute = await classifyEmergencyWithAi(description);
        if (aiRoute?.escalation === 'ask_followup') {
          setRouteSummary('Gemma needs one safety check before escalating.');
          setStatusMessage(aiRoute.askNext || safetyTriage?.question || getDefaultSafetyFollowUp());
          return;
        }
        if (aiRoute?.escalation === 'not_911' && aiRoute.confidence >= 0.45) {
          setRouteSummary('Gemma did not find an immediate 911-level emergency.');
          setStatusMessage(aiRoute.askNext || 'What is happening right now, and is anyone in immediate danger?');
          return;
        }
        if (aiRoute?.top911Rank) {
          const item = TOP_911_EMERGENCIES.find((entry) => entry.rank === aiRoute.top911Rank);
          if (item) {
            setRouteSummary(`Gemma matched top-50 #${item.rank}: ${item.title}`);
            await openResearchEmergency(item, aiRoute.dispatcherBrief || createDispatcherBrief({ description, top911Emergency: item }));
            return;
          }
        }

        if (aiRoute?.protocolType && aiRoute.protocolType !== 'unknown' && aiRoute.confidence >= 0.35) {
          setRouteSummary(`Gemma route word: ${aiRoute.protocolType}`);
          await openProtocol(
            aiRoute.protocolType,
            aiRoute.askNext || `Gemma route word: ${aiRoute.protocolType}`,
            aiRoute.dispatcherBrief || createDispatcherBrief({ description, protocol: resolveProtocolForInput(aiRoute.protocolType) }),
          );
          return;
        }
      }

      if (safetyTriage?.action === 'ask') {
        setRouteSummary(safetyTriage.summary);
        setStatusMessage(safetyTriage.question);
        return;
      }

      const researchMatch = findTop911Emergency(description);
      if (researchMatch) {
        const routeType = getTop911ProtocolOverride(researchMatch) ?? researchMatch.protocolType;
        setRouteSummary(`Fallback matched top-50 #${researchMatch.rank}: ${researchMatch.title}`);
        if (routeType) {
          await openProtocol(routeType, `${researchMatch.title}: ${researchMatch.firstAction}`, createDispatcherBrief({ description, top911Emergency: researchMatch }));
          return;
        }
        await openResearchEmergency(researchMatch, createDispatcherBrief({ description, top911Emergency: researchMatch }));
        return;
      }

      const classifiedType = await classifyEmergency(description);
      setRouteSummary(`Fallback route word: ${classifiedType}`);
      if (classifiedType === 'unknown') {
        setStatusMessage('I need one more detail before opening a 911 guide. What is happening right now, and is anyone hurt, trapped, threatened, or in immediate danger?');
        return;
      }
      await openProtocol(
        classifiedType,
        `Fallback route word: ${classifiedType}`,
        createDispatcherBrief({ description, protocol: resolveProtocolForInput(classifiedType) }),
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function startKnownEmergency(type: EmergencyType) {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await openProtocol(type, type === 'unknown' ? 'Start here when you are unsure. Call 911 and describe what you see.' : '');
    } finally {
      setIsProcessing(false);
    }
  }

  async function openProtocol(type: EmergencyType, message = '', brief?: string) {
    const nextProtocol = resolveProtocolForInput(type);

    resetCompressionCoach();
    resetBleedingTimers();
    setProtocol(nextProtocol);
    setCurrentStepIndex(0);
    setPhase('guide');
    setStatusMessage(message);
    setDispatcherBrief(brief ?? createDispatcherBrief({ protocol: nextProtocol }));
    setBehaviorNudge(getBehaviorNudgeForProtocol(type));
    setCompletedRoles({});
    setTranslatedStep(null);
    setHtmlHelper(null);
    setHtmlHelperOpen(false);
    setSelectedLanguage('en');
    if (aiReady && !brief) {
      generateDispatcherBriefWithAi({ protocol: nextProtocol }).then((aiBrief) => {
        if (aiBrief) setDispatcherBrief(aiBrief);
      });
    }
    if (type !== 'unsafe_scene') {
      await speakStep(nextProtocol, 0);
    }
  }

  async function openResearchEmergency(item: Top911Emergency, brief?: string) {
    const routeType = getTop911ProtocolOverride(item) ?? item.protocolType;
    if (routeType) {
      await openProtocol(routeType, `${item.title}: ${item.firstAction}`, brief ?? createDispatcherBrief({ top911Emergency: item }));
      return;
    }

    const researchProtocol = createResearchProtocol(item);
    resetCompressionCoach();
    resetBleedingTimers();
    setProtocol(researchProtocol);
    setCurrentStepIndex(0);
    setPhase('guide');
    setStatusMessage('Stay on the line and follow dispatcher instructions.');
    setDispatcherBrief(brief ?? createDispatcherBrief({ top911Emergency: item }));
    setBehaviorNudge(getBehaviorNudgeForTop911(item));
    setCompletedRoles({});
    setTranslatedStep(null);
    setHtmlHelper(null);
    setHtmlHelperOpen(false);
    setSelectedLanguage('en');
    if (aiReady && !brief) {
      generateDispatcherBriefWithAi({ top911Emergency: item }).then((aiBrief) => {
        if (aiBrief) setDispatcherBrief(aiBrief);
      });
    }
    await speakStep(researchProtocol, 0);
  }

  async function speakStep(targetProtocol = protocol, targetIndex = currentStepIndex) {
    if (targetProtocol?.type === 'unsafe_scene') return;
    const step = targetProtocol?.steps[targetIndex];
    if (!step) return;
    const shouldTranslate = selectedLanguage !== 'en';
    let spokenStep: EmergencyStep | TranslatedStep = step;
    let speechLanguage: EmergencyLanguageCode = 'en';

    if (shouldTranslate) {
      const existingTranslation = targetProtocol === protocol && targetIndex === currentStepIndex ? translatedStep : null;
      const translation = existingTranslation ?? (aiReady ? await translateEmergencyStepWithAi(step, selectedLanguage) : null);
      if (!translation) {
        setStatusMessage('Translation is not ready, so speech is paused instead of reading English with the selected voice.');
        return;
      }
      spokenStep = translation;
      speechLanguage = selectedLanguage;
      if (targetProtocol === protocol && targetIndex === currentStepIndex) {
        setTranslatedStep(translation);
        if (protocol) {
          setHtmlHelper(createLanguageHtmlHelper(protocol, step, translation, selectedLanguage));
          setHtmlHelperOpen(true);
        }
      }
    }

    try {
      await VoiceIO.speak({
        text: [spokenStep.instruction, spokenStep.detail].filter(Boolean).join(' '),
        language: getSpeechLanguage(speechLanguage),
        rate: 0.94,
      });
    } catch {
      // Voice is helpful, but visual guidance remains the source of truth.
    }
  }

  async function markDone() {
    if (!protocol) return;
    if (isLastStep) {
      setCompletedEmergencyTitle(protocol.title);
      VoiceIO.stopSpeaking().catch(() => undefined);
      resetCompressionCoach();
      setPhase('aftercare');
      return;
    }

    const nextIndex = currentStepIndex + 1;
    if (isCprCompressionStep(protocol, currentStep)) {
      resetCompressionCoach();
    }
    if (isCprCompressionStep(protocol, protocol.steps[nextIndex])) {
      resetCompressionCoach();
    }
    setTranslatedStep(null);
    setHtmlHelper(null);
    setHtmlHelperOpen(false);
    setCurrentStepIndex(nextIndex);
    setStatusMessage('');
    if (!isCprCompressionStep(protocol, protocol.steps[nextIndex]) && protocol.type !== 'unsafe_scene') {
      await speakStep(protocol, nextIndex);
    }
  }

  async function getAltGuidance() {
    if (!protocol || !currentStep || isProcessing) return;

    setIsProcessing(true);
    setStatusMessage(aiReady ? 'Getting constrained Gemma guidance...' : 'Getting alternate guidance...');
    try {
      const guidance = aiReady
        ? await getConstrainedAlternativeGuidanceWithAi(protocol, currentStepIndex, 'not working')
        : await getAlternativeEmergencyGuidance(protocol, currentStepIndex, 'not working');

      if (selectedLanguage !== 'en') {
        const translation = aiReady
          ? await translateEmergencyStepWithAi({ number: currentStep.number, instruction: guidance }, selectedLanguage)
          : null;
        if (translation) {
          setStatusMessage(translation.instruction);
          await VoiceIO.speak({ text: translation.instruction, language: getSpeechLanguage(selectedLanguage), rate: 0.94 }).catch(() => undefined);
          return;
        }
        setStatusMessage('Translation failed. Showing English alternate guidance, but not speaking it with the selected voice.');
        return;
      }

      setStatusMessage(guidance);
      if (protocol.type !== 'unsafe_scene') {
        await VoiceIO.speak({ text: guidance, language: 'en-US', rate: 0.94 }).catch(() => undefined);
      }
    } finally {
      setIsProcessing(false);
    }
  }

  function resetEmergency() {
    VoiceIO.stopSpeaking().catch(() => undefined);
    resetCompressionCoach();
    setPhase('input');
    setProtocol(null);
    setCurrentStepIndex(0);
    setStatusMessage('');
    setDispatcherBrief('');
    setBehaviorNudge(null);
    setCompletedRoles({});
    setTranslatedStep(null);
    setHtmlHelper(null);
    setHtmlHelperOpen(false);
    setSelectedLanguage('en');
    resetBleedingTimers();
  }

  function resetCompressionCoach() {
    setCompressionCount(0);
    setCompressionElapsedSeconds(0);
    setCompressionBeat(0);
  }

  function resetBleedingTimers() {
    setPressureStartedAt(null);
    setTourniquetAppliedAt(null);
  }

  function requestCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationState((current) => ({
        ...current,
        status: 'error',
        error: 'Location is not available on this device.',
      }));
      return;
    }

    setLocationState((current) => ({ ...current, status: 'loading', error: undefined, copied: false }));
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationState((current) => ({
          ...current,
          status: 'ready',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: undefined,
        }));
      },
      (error) => {
        setLocationState((current) => ({
          ...current,
          status: 'error',
          error: error.message || 'Could not get location. Type a landmark instead.',
        }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 },
    );
  }

  function updateLocationNote(note: string) {
    setLocationState((current) => ({ ...current, note, copied: false }));
  }

  async function copyLocationScript() {
    const script = createLocationScript(locationState, dispatcherBrief || createDispatcherBrief({ protocol: protocol ?? undefined }));
    try {
      await navigator.clipboard?.writeText(script);
      setLocationState((current) => ({ ...current, copied: true }));
    } catch {
      setLocationState((current) => ({ ...current, copied: false, error: 'Could not copy. Read the location card to 911.' }));
    }
  }

  function toggleRole(role: string) {
    setCompletedRoles((current) => ({ ...current, [role]: !current[role] }));
  }

  function startTimer(kind: 'pressure' | 'tourniquet') {
    const now = Date.now();
    setTimerNow(now);
    if (kind === 'pressure') {
      setPressureStartedAt((current) => current ?? now);
      return;
    }
    setTourniquetAppliedAt((current) => current ?? now);
  }

  async function openHtmlHelper() {
    if (!protocol || !currentStep) return;

    setHtmlHelperOpen(true);
    if (htmlHelper) return;

    setIsGeneratingHelper(true);
    try {
      if (selectedLanguage !== 'en') {
        const translation = translatedStep ?? (aiReady ? await translateEmergencyStepWithAi(currentStep, selectedLanguage) : null);
        if (translation) {
          setTranslatedStep(translation);
          setHtmlHelper(createLanguageHtmlHelper(protocol, currentStep, translation, selectedLanguage));
          return;
        }
        setHtmlHelper(createLanguageFallbackHtmlHelper(currentStep, selectedLanguage));
        return;
      }

      const aiHelper = aiReady ? await generateInteractiveHelperWithAi(protocol, currentStep) : null;
      setHtmlHelper(aiHelper ?? createFallbackHtmlHelper(protocol, currentStep));
    } finally {
      setIsGeneratingHelper(false);
    }
  }

  if (phase === 'aftercare') {
    return (
      <AfterEmergencyScreen
        emergencyTitle={completedEmergencyTitle}
        onBackHome={resetEmergency}
      />
    );
  }

  if (phase === 'guide' && protocol && currentStep) {
    if (isSilentGuide) {
      return (
        <SilentUnsafeGuide
          dispatcherBrief={dispatcherBrief}
          currentStep={currentStep}
          progress={progress}
          location={locationState}
          onCopy={copyLocationScript}
          onDone={markDone}
          onExit={resetEmergency}
          onNoteChange={updateLocationNote}
          onRequestLocation={requestCurrentLocation}
        />
      );
    }

    return (
      <div className="flex min-h-full flex-col gap-4">
        <header className="space-y-3">
          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" size="icon" rounded="2xl" onClick={resetEmergency} aria-label="Exit emergency guide">
              <ArrowLeft size={22} aria-hidden="true" />
            </Button>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-wider text-rose-600">Emergency guide</p>
              <h1 className="truncate text-2xl font-black leading-tight text-slate-950 dark:text-white">{protocol.title}</h1>
              <p className="mt-1 truncate text-xs font-bold text-slate-500 dark:text-slate-300">{modelMode.guideLabel}</p>
            </div>
            <a
              href="tel:911"
              className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-lg shadow-rose-600/30 active:scale-95"
              aria-label="Call 911"
            >
              <PhoneCall size={22} aria-hidden="true" />
            </a>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-300">
              <span>
                Step {currentStep.number} of {protocol.steps.length}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-rose-100 dark:bg-white/10">
              <div className="h-full rounded-full bg-rose-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </header>

        {statusMessage ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm dark:border-amber-400/40 dark:bg-amber-400/15">
            <div className="flex gap-3">
              <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden="true" />
              <p className="text-sm font-semibold leading-6 text-amber-950 dark:text-amber-100">{statusMessage}</p>
            </div>
          </div>
        ) : null}

        <Card className="rounded-[1.25rem] border border-rose-200/80 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-rose-700">
                Do this now
              </p>
              <h2 className="mt-4 text-3xl font-black leading-tight text-slate-950 dark:text-white">{visibleStep?.instruction}</h2>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white">
              <ShieldAlert size={26} aria-hidden="true" />
            </div>
          </div>

          {visibleStep?.detail ? <p className="mt-5 text-lg leading-8 text-slate-700 dark:text-slate-200">{visibleStep.detail}</p> : null}
        </Card>

        <LanguageControls
          aiReady={aiReady}
          isTranslating={isTranslating}
          selectedLanguage={selectedLanguage}
          onSelect={(language) => {
            setSelectedLanguage(language);
            if (language === 'en') {
              setTranslatedStep(null);
              setHtmlHelper(null);
              setHtmlHelperOpen(false);
              speakStep();
              return;
            }
            setTranslatedStep(null);
            setHtmlHelper(null);
          }}
        />

        {isCompressionCoachActive ? (
          <CprCompressionCoach
            beat={compressionBeat}
            compressionCount={compressionCount}
            elapsedSeconds={compressionElapsedSeconds}
          />
        ) : null}

        {protocol.type === 'bleeding' ? (
          <BleedingTimerCard
            now={timerNow}
            pressureStartedAt={pressureStartedAt}
            tourniquetAppliedAt={tourniquetAppliedAt}
            onStartPressure={() => startTimer('pressure')}
            onApplyTourniquet={() => startTimer('tourniquet')}
          />
        ) : null}

        {protocol.type === 'medical' ? <MedicalRedFlagsCard /> : null}

        <section className="grid gap-3">
          <Button type="button" size="lg" rounded="2xl" className="min-h-16 gap-3 bg-rose-600 text-xl hover:shadow-rose-600/30" onClick={markDone}>
            <CheckCircle2 size={24} aria-hidden="true" />
            {isLastStep ? 'Help is coming' : 'Done'}
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              rounded="2xl"
              className="min-h-14 gap-2 border-amber-500 text-amber-700 hover:bg-amber-50"
              onClick={getAltGuidance}
              isLoading={isProcessing}
            >
              <RotateCcw size={19} aria-hidden="true" />
              Not working
            </Button>
            <Button type="button" variant="outline" rounded="2xl" className="min-h-14 gap-2" onClick={() => speakStep()}>
              <Volume2 size={19} aria-hidden="true" />
              Repeat
            </Button>
          </div>
        </section>

        <HelperRolesCard roles={helperRoles} completedRoles={completedRoles} onToggle={toggleRole} />

        <HtmlHelperPanel
          helper={htmlHelper}
          isGenerating={isGeneratingHelper}
          isOpen={htmlHelperOpen}
          language={selectedLanguage}
          onOpen={openHtmlHelper}
          onClose={() => setHtmlHelperOpen(false)}
        />

        <EmergencyCallFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col gap-4">
      <header className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-rose-600">Manan Surati Offline Crisis Companion</p>
            <h1 className="mt-1 text-4xl font-black leading-none text-slate-950 dark:text-white">Emergency</h1>
            <p className="mt-2 text-sm font-bold text-slate-600 dark:text-slate-300">{modelMode.homeLabel}</p>
          </div>
          <Link
            to="/model"
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-rose-200 bg-white/80 text-slate-500 shadow-sm active:scale-95 dark:border-white/10 dark:bg-white/10 dark:text-slate-300"
            aria-label="Open model settings"
          >
            <Cpu size={21} aria-hidden="true" />
          </Link>
        </div>

        <div className="flex min-h-16 items-center justify-between rounded-[1.25rem] bg-rose-600 px-5 text-white shadow-xl shadow-rose-600/25 active:scale-[0.99]">
          <span>
            <span className="block text-xs font-black uppercase tracking-wider text-white/80">Immediate danger?</span>
            <span className="block text-2xl font-black">Call 911 now</span>
          </span>
          <a href="tel:911" className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/15" aria-label="Call 911 now">
            <PhoneCall size={28} aria-hidden="true" />
          </a>
        </div>
      </header>

      <Card className="rounded-[1.25rem] border border-rose-200/80 p-4">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            routeEmergencyFromSearch();
          }}
        >
          <label htmlFor="emergency-router" className="text-sm font-black text-slate-950 dark:text-white">
            Describe the emergency
          </label>
          <div className="flex gap-2">
            <input
              id="emergency-router"
              value={routeQuery}
              onChange={(event) => setRouteQuery(event.target.value)}
              placeholder="Example: dad fell, gas smell, chest pain..."
              className="h-14 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white/90 px-4 text-base font-semibold text-slate-900 outline-none transition focus:border-rose-500 dark:border-white/10 dark:bg-slate-900/70 dark:text-white"
            />
            <Button type="submit" size="icon" rounded="2xl" className="h-14 w-14 shrink-0 bg-rose-600" isLoading={isProcessing} aria-label="Route emergency">
              <Search size={21} aria-hidden="true" />
            </Button>
          </div>
          <p className="text-xs font-bold leading-5 text-slate-500 dark:text-slate-300">
            {aiReady ? 'Gemma routes first. Rules and top-50 matching back it up.' : 'Rules and top-50 matching active. Gemma routes on Android when ready.'}
          </p>
          {routeSummary ? <p className="text-xs font-black text-emerald-700 dark:text-emerald-200">{routeSummary}</p> : null}
        </form>
      </Card>

      <Card className="rounded-[1.25rem] border border-rose-200/70 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-950 dark:text-white">What is happening?</h2>
            <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">Tap one. The app speaks one step at a time.</p>
          </div>
          <div className={`rounded-full px-3 py-1 text-xs font-black ${modelMode.pillClass}`}>{modelMode.pill}</div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <QuickActionButton key={action.title} action={action} onClick={() => startKnownEmergency(action.type)} />
          ))}
        </div>
      </Card>

      <Card className="rounded-[1.25rem] border border-slate-200/80 p-4">
        <div className="grid gap-2">
          {quickChecks.map((check) => (
            <div key={check} className="flex items-start gap-2 text-sm font-semibold leading-5 text-slate-700 dark:text-slate-200">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              <span>{check}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="rounded-[1.25rem] border border-amber-200/80 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-950 dark:text-white">Hazard shortcuts</h2>
            <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">CO, gas, and wires have different safety rules.</p>
          </div>
          <AlertTriangle className="h-6 w-6 shrink-0 text-amber-600" aria-hidden="true" />
        </div>
        <div className="mt-4 grid gap-2">
          {[
            { type: 'carbon_monoxide' as EmergencyType, title: 'CO alarm', detail: 'Leave building now' },
            { type: 'gas_leak' as EmergencyType, title: 'Gas smell', detail: 'Do not touch switches' },
            { type: 'powerline' as EmergencyType, title: 'Downed wire', detail: 'Stay far away' },
          ].map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => startKnownEmergency(item.type)}
              className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 text-left active:scale-[0.99] dark:border-amber-400/30 dark:bg-amber-400/10"
            >
              <span>
                <span className="block text-sm font-black text-slate-950 dark:text-white">{item.title}</span>
                <span className="block text-xs font-bold text-slate-600 dark:text-slate-300">{item.detail}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-200" aria-hidden="true" />
            </button>
          ))}
        </div>
      </Card>

      <Card className="rounded-[1.25rem] border border-slate-200/80 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-950 dark:text-white">Common 911 calls</h2>
            <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">Research-backed caller clues from the top 50 workbook.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-white/10 dark:text-slate-200">Top 50</span>
        </div>

        <input
          value={researchQuery}
          onChange={(event) => setResearchQuery(event.target.value)}
          placeholder="Search chest pain, fall, gas leak..."
          className="mt-4 h-12 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 text-base font-medium text-slate-800 outline-none transition focus:border-rose-500 dark:border-white/10 dark:bg-slate-900/70 dark:text-white"
        />

        <div className="mt-3 grid gap-2">
          {common911Matches.map((item) => (
            <button
              key={item.rank}
              type="button"
              onClick={() => openResearchEmergency(item)}
              className="flex min-h-16 items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 text-left shadow-sm transition active:scale-[0.99] dark:border-white/10 dark:bg-slate-900/70"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white dark:bg-white dark:text-slate-950">
                {item.rank}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black leading-5 text-slate-950 dark:text-white">{item.title}</span>
                <span className="mt-1 block text-xs font-semibold leading-4 text-slate-500 dark:text-slate-300">{item.category} - {item.primaryResponse}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
            </button>
          ))}
        </div>
      </Card>

      {statusMessage ? (
        <div className="fixed left-1/2 top-4 z-50 flex max-w-[90vw] -translate-x-1/2 items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-xl">
          {isProcessing ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <X size={16} aria-hidden="true" />}
          {statusMessage}
        </div>
      ) : null}
    </div>
  );
}

function QuickActionButton({
  action,
  onClick,
}: {
  action: (typeof quickActions)[number];
  onClick: () => void;
}) {
  const Icon = action.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-28 flex-col items-start justify-between rounded-2xl p-4 text-left shadow-lg transition active:scale-[0.98] ${action.tone}`}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <Icon size={25} aria-hidden="true" />
        <ChevronRight size={20} aria-hidden="true" />
      </div>
      <span>
        <span className="block text-lg font-black leading-tight">{action.title}</span>
        <span className="mt-1 block text-xs font-bold opacity-85">{action.detail}</span>
      </span>
    </button>
  );
}

function LanguageControls({
  aiReady,
  isTranslating,
  selectedLanguage,
  onSelect,
}: {
  aiReady: boolean;
  isTranslating: boolean;
  selectedLanguage: EmergencyLanguageCode;
  onSelect: (language: EmergencyLanguageCode) => void;
}) {
  const selectedLanguageName = getLanguageName(selectedLanguage);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-950 dark:text-white">Language helper</p>
          <p className="mt-0.5 text-xs font-bold text-slate-500 dark:text-slate-300">{selectedLanguageName}</p>
        </div>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-300">
          {isTranslating ? 'Translating...' : aiReady ? 'Gemma assisted' : 'Gemma needed'}
        </p>
      </div>
      <label className="mt-3 block">
        <span className="sr-only">Choose language for the HTML helper</span>
        <select
          value={selectedLanguage}
          disabled={isTranslating}
          onChange={(event) => onSelect(event.target.value as EmergencyLanguageCode)}
          className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-black text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/20 disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:text-white"
        >
          {EMERGENCY_LANGUAGES.map((language) => (
            <option key={language.code} value={language.code}>
              {language.englishName} ({language.label})
            </option>
          ))}
        </select>
      </label>
      {!aiReady && selectedLanguage !== 'en' ? (
        <p className="mt-2 text-xs font-bold leading-5 text-amber-700 dark:text-amber-200">
          Android Gemma will generate this language in the HTML helper. Browser preview cannot translate it.
        </p>
      ) : null}
    </div>
  );
}

function HelperRolesCard({
  roles,
  completedRoles,
  onToggle,
}: {
  roles: string[];
  completedRoles: Record<string, boolean>;
  onToggle: (role: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-sm dark:border-violet-400/30 dark:bg-violet-400/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-200">Helper roles</p>
          <p className="mt-2 text-base font-black leading-6 text-slate-950 dark:text-white">If people are nearby, assign jobs.</p>
        </div>
        <Users className="h-6 w-6 shrink-0 text-violet-700 dark:text-violet-200" aria-hidden="true" />
      </div>

      <div className="mt-3 grid gap-2">
        {roles.map((role) => {
          const isDone = Boolean(completedRoles[role]);
          return (
            <button
              key={role}
              type="button"
              onClick={() => onToggle(role)}
              className={`flex min-h-12 items-center gap-3 rounded-2xl border px-3 py-2 text-left text-sm font-bold transition active:scale-[0.99] ${
                isDone
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-400/15 dark:text-emerald-100'
                  : 'border-violet-200 bg-white/80 text-slate-800 dark:border-white/10 dark:bg-white/10 dark:text-slate-100'
              }`}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isDone ? 'bg-emerald-600 text-white' : 'bg-violet-100 text-violet-700 dark:bg-violet-400/20 dark:text-violet-100'}`}>
                {isDone ? <CheckCircle2 size={16} aria-hidden="true" /> : <Users size={15} aria-hidden="true" />}
              </span>
              <span>{role}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HtmlHelperPanel({
  helper,
  isGenerating,
  isOpen,
  language,
  onClose,
  onOpen,
}: {
  helper: EmergencyHtmlHelper | null;
  isGenerating: boolean;
  isOpen: boolean;
  language: EmergencyLanguageCode;
  onClose: () => void;
  onOpen: () => void;
}) {
  const isLanguageMode = language !== 'en';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-300">
            {isLanguageMode ? 'Language helper' : 'Optional helper'}
          </p>
          <p className="mt-1 text-base font-black text-slate-950 dark:text-white">
            {isLanguageMode ? `${getLanguageName(language)} HTML view` : 'Interactive HTML view'}
          </p>
        </div>
        <Button type="button" variant="outline" rounded="2xl" className="min-h-11 px-4" onClick={isOpen ? onClose : onOpen} isLoading={isGenerating}>
          {isOpen ? 'Hide' : 'Open'}
        </Button>
      </div>

      {isOpen ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10">
          {helper ? (
            <iframe
              title="Interactive emergency helper"
              sandbox=""
              srcDoc={createHelperHtml(helper)}
              className="h-80 w-full bg-white"
            />
          ) : (
            <div className="flex h-32 items-center justify-center text-sm font-bold text-slate-500">
              Building helper...
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function BleedingTimerCard({
  now,
  pressureStartedAt,
  tourniquetAppliedAt,
  onStartPressure,
  onApplyTourniquet,
}: {
  now: number;
  pressureStartedAt: number | null;
  tourniquetAppliedAt: number | null;
  onStartPressure: () => void;
  onApplyTourniquet: () => void;
}) {
  return (
    <div className="rounded-2xl border border-red-300 bg-red-50 p-4 shadow-sm dark:border-red-400/40 dark:bg-red-400/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-red-700 dark:text-red-200">Bleeding timer</p>
          <p className="mt-2 text-base font-black leading-6 text-slate-950 dark:text-white">Keep pressure. Do not lift the cloth.</p>
        </div>
        <Timer className="h-6 w-6 shrink-0 text-red-700 dark:text-red-200" aria-hidden="true" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <TimerButton
          label="Pressure started"
          value={pressureStartedAt ? formatElapsed(now - pressureStartedAt) : 'Start'}
          active={Boolean(pressureStartedAt)}
          onClick={onStartPressure}
        />
        <TimerButton
          label="Tourniquet applied"
          value={tourniquetAppliedAt ? formatClockTime(tourniquetAppliedAt) : 'Mark time'}
          active={Boolean(tourniquetAppliedAt)}
          onClick={onApplyTourniquet}
        />
      </div>
      <p className="mt-3 text-sm font-semibold leading-5 text-red-950 dark:text-red-100">
        If blood soaks through, add more cloth on top. If a tourniquet is used, tell EMS the exact time.
      </p>
    </div>
  );
}

function TimerButton({
  active,
  label,
  onClick,
  value,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  value: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-20 rounded-2xl border p-3 text-left transition active:scale-[0.98] ${
        active
          ? 'border-red-700 bg-red-700 text-white'
          : 'border-red-200 bg-white/85 text-slate-900 dark:border-white/10 dark:bg-white/10 dark:text-white'
      }`}
    >
      <span className="block text-xs font-black uppercase leading-4 opacity-80">{label}</span>
      <span className="mt-2 block text-xl font-black tabular-nums">{value}</span>
    </button>
  );
}

function MedicalRedFlagsCard() {
  const questions = [
    'When did it start or when were they last normal?',
    'Are they awake? Are they breathing normally?',
    'Chest pain, stroke signs, seizure, severe headache, or fainting?',
    'Pregnancy, overdose, diabetes, blood thinners, or major trauma?',
  ];

  return (
    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 shadow-sm dark:border-cyan-400/30 dark:bg-cyan-400/10">
      <p className="text-xs font-black uppercase tracking-wide text-cyan-700 dark:text-cyan-200">Medical red flags</p>
      <p className="mt-2 text-base font-black leading-6 text-slate-950 dark:text-white">Do not diagnose. Feed dispatch facts.</p>
      <div className="mt-3 grid gap-2">
        {questions.map((question) => (
          <div key={question} className="flex items-start gap-2 text-sm font-semibold leading-5 text-slate-700 dark:text-slate-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700 dark:text-cyan-200" aria-hidden="true" />
            <span>{question}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SilentUnsafeGuide({
  currentStep,
  dispatcherBrief,
  location,
  onCopy,
  onDone,
  onExit,
  onNoteChange,
  onRequestLocation,
  progress,
}: {
  currentStep: EmergencyStep;
  dispatcherBrief: string;
  location: EmergencyLocationState;
  onCopy: () => void;
  onDone: () => void;
  onExit: () => void;
  onNoteChange: (note: string) => void;
  onRequestLocation: () => void;
  progress: number;
}) {
  const quietScript = createLocationScript(location, dispatcherBrief || 'I cannot speak. I need emergency help. Send police and EMS.');

  return (
    <div className="flex min-h-dvh flex-col gap-4 bg-black p-4 text-white">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-white/60">Silent unsafe mode</p>
            <h1 className="mt-1 text-2xl font-black">Stay quiet. Stay hidden.</h1>
          </div>
          <EyeOff className="h-7 w-7 text-white/80" aria-hidden="true" />
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <div className="rounded-2xl border border-white/15 bg-white/10 p-5">
        <p className="text-xs font-black uppercase tracking-wide text-white/60">Do this now</p>
        <h2 className="mt-3 text-3xl font-black leading-tight">{currentStep.instruction}</h2>
        {currentStep.detail ? <p className="mt-4 text-lg font-semibold leading-7 text-white/85">{currentStep.detail}</p> : null}
      </div>

      <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
        <p className="text-xs font-black uppercase tracking-wide text-white/60">911 quiet script</p>
        <p className="mt-2 text-base font-bold leading-6">{quietScript}</p>
        <input
          value={location.note}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="Location, apartment, room, landmark"
          className="mt-3 h-12 w-full rounded-2xl border border-white/15 bg-black/70 px-4 text-base font-medium text-white outline-none placeholder:text-white/40"
        />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={onRequestLocation} className="min-h-12 rounded-2xl bg-white px-3 text-sm font-black text-black active:scale-95">
            GPS
          </button>
          <button type="button" onClick={onCopy} className="min-h-12 rounded-2xl border border-white/25 px-3 text-sm font-black text-white active:scale-95">
            Copy script
          </button>
        </div>
      </div>

      <button type="button" onClick={onDone} className="min-h-16 rounded-2xl bg-white text-xl font-black text-black active:scale-[0.99]">
        Done
      </button>
      <button type="button" onClick={onExit} className="mt-auto min-h-11 rounded-xl text-xs font-bold text-white/45">
        Exit
      </button>
    </div>
  );
}

function AfterEmergencyScreen({
  emergencyTitle,
  onBackHome,
}: {
  emergencyTitle: string;
  onBackHome: () => void;
}) {
  return (
    <div className="flex min-h-full flex-col gap-4">
      <Card className="rounded-[1.25rem] border border-emerald-200 p-5">
        <p className="text-xs font-black uppercase tracking-wide text-emerald-700">After emergency</p>
        <h1 className="mt-3 text-3xl font-black leading-tight text-slate-950 dark:text-white">
          You may feel shaky. That is common.
        </h1>
        <p className="mt-4 text-base font-semibold leading-7 text-slate-700 dark:text-slate-200">
          {emergencyTitle ? `${emergencyTitle} guide ended. ` : ''}
          Contact someone you trust. Seek medical or mental health help if symptoms continue or you feel unsafe.
        </p>
      </Card>

      <div className="grid gap-3">
        <a href="tel:" className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-base font-black text-white active:scale-95 dark:bg-white dark:text-slate-950">
          <PhoneCall size={19} aria-hidden="true" />
          Call trusted contact
        </a>
        <a href="tel:988" className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 text-base font-black text-slate-800 active:scale-95 dark:border-white/20 dark:text-white">
          Crisis support 988
        </a>
        <button type="button" onClick={onBackHome} className="min-h-14 rounded-2xl border border-slate-300 px-4 text-base font-black text-slate-800 active:scale-95 dark:border-white/20 dark:text-white">
          Back to emergency home
        </button>
      </div>
    </div>
  );
}

function EmergencyCallFooter() {
  return (
    <a
      href="tel:911"
      className="mt-auto flex min-h-16 items-center justify-center gap-3 rounded-[1.25rem] bg-rose-600 px-5 text-xl font-black text-white shadow-xl shadow-rose-600/25 active:scale-[0.99]"
    >
      <PhoneCall size={24} aria-hidden="true" />
      Call 911
    </a>
  );
}

function CprCompressionCoach({
  beat,
  compressionCount,
  elapsedSeconds,
}: {
  beat: number;
  compressionCount: number;
  elapsedSeconds: number;
}) {
  const isPushBeat = beat % 2 === 1;
  const switchWarning = elapsedSeconds >= 100;
  const cycleCount = compressionCount % 30 === 0 && compressionCount > 0 ? 30 : compressionCount % 30;

  return (
    <Card className="rounded-[1.25rem] border border-rose-300 bg-rose-50/90 p-5 dark:border-rose-500/40 dark:bg-rose-500/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-rose-700 dark:text-rose-200">Compression coach</p>
          <h3 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Follow the beat</h3>
        </div>
        <div className="rounded-2xl bg-white px-3 py-2 text-right shadow-sm dark:bg-white/10">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-300">Target</p>
          <p className="text-lg font-black text-rose-700 dark:text-rose-200">110/min</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-[1fr_auto] items-center gap-5">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <CoachMetric label="Time" value={formatCoachTime(elapsedSeconds)} />
            <CoachMetric label="Pushes" value={String(compressionCount)} />
            <CoachMetric label="Cycle" value={`${cycleCount}/30`} />
          </div>

          <div className="rounded-2xl bg-white/80 p-3 dark:bg-white/10">
            <p className="text-sm font-black text-slate-950 dark:text-white">Push hard. Release fully.</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
              The pulse, vibration, and voice prompts continue until you tap Done.
            </p>
          </div>
        </div>

        <div
          className={`flex h-28 w-28 shrink-0 items-center justify-center rounded-full text-center shadow-xl transition-all duration-150 ${
            isPushBeat ? 'scale-110 bg-rose-600 text-white shadow-rose-600/30' : 'scale-95 bg-white text-rose-700 dark:bg-white/10 dark:text-rose-200'
          }`}
          aria-label={isPushBeat ? 'Push now' : 'Let the chest rise'}
        >
          <span className="text-2xl font-black">{isPushBeat ? 'PUSH' : 'RISE'}</span>
        </div>
      </div>

      {switchWarning ? (
        <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold leading-5 text-amber-950 dark:border-amber-400/40 dark:bg-amber-400/15 dark:text-amber-100">
          Near 2 minutes. If another helper is ready, switch compressors without a long pause.
        </div>
      ) : null}
    </Card>
  );
}

function CoachMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/80 px-3 py-2 text-center shadow-sm dark:bg-white/10">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function formatCoachTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function isCprCompressionStep(protocol: EmergencyProtocol | null, step: EmergencyStep | undefined) {
  return protocol?.type === 'cardiac_arrest' && step?.number === 3;
}

function getModelMode(status: OfflineModelStatus | null) {
  if (status?.platform === 'web') {
    return {
      pill: 'Rules only',
      homeLabel: 'Browser preview uses rules and scripted guides. Gemma runs only in the Android build.',
      guideLabel: 'Browser preview: no Gemma inference',
      pillClass: 'bg-amber-50 text-amber-800 dark:bg-amber-400/15 dark:text-amber-100',
    };
  }

  if (status?.modelExists && status.nativeReady) {
    return {
      pill: 'Gemma ready',
      homeLabel: `${status.selectedModelName ?? 'Gemma'} is ready for AI classification and alternate guidance.`,
      guideLabel: `${status.selectedModelName ?? 'Gemma'} active for AI assist`,
      pillClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-100',
    };
  }

  if (status?.platform === 'android') {
    return {
      pill: 'Rules fallback',
      homeLabel: 'Android model is not ready, so emergency guides use rules and built-in protocols.',
      guideLabel: 'Rules fallback: model not ready',
      pillClass: 'bg-amber-50 text-amber-800 dark:bg-amber-400/15 dark:text-amber-100',
    };
  }

  return {
    pill: 'Checking',
    homeLabel: 'Checking local model status...',
    guideLabel: 'Checking model status',
    pillClass: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-200',
  };
}

function createDispatcherBrief(input: {
  description?: string;
  protocol?: EmergencyProtocol;
  top911Emergency?: Top911Emergency;
}) {
  if (input.description) {
    return `Exact location. ${input.description.trim().slice(0, 120)}. Say who is hurt, whether they are awake, and whether they are breathing.`;
  }

  if (input.top911Emergency) {
    return `Exact location. ${input.top911Emergency.title}. ${input.top911Emergency.firstAction}`;
  }

  if (input.protocol) {
    if (input.protocol.type === 'unsafe_scene') {
      return 'I cannot speak. Exact location. I need police and EMS. There is active danger.';
    }
    return `Exact location. ${input.protocol.title}. Say who is hurt, whether they are awake, and whether they are breathing.`;
  }

  return 'Exact location. Say what happened, who is hurt or in danger, and stay on the line.';
}

function createLocationScript(location: EmergencyLocationState, brief: string) {
  const lines = [brief || 'Exact location. Say what happened and who is hurt.'];

  if (typeof location.latitude === 'number' && typeof location.longitude === 'number') {
    lines.push(`GPS coordinates: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}.`);
    if (typeof location.accuracy === 'number') {
      lines.push(`Accuracy about ${Math.round(location.accuracy)} meters.`);
    }
  }

  if (location.note.trim()) {
    lines.push(`Landmark/access note: ${location.note.trim()}.`);
  }

  return lines.join(' ');
}

function getHelperRoles(protocol: EmergencyProtocol | null, behaviorNudge: BehaviorNudge | null) {
  if (protocol?.type === 'cardiac_arrest') {
    return ['Call 911 on speaker', 'Get the AED', 'Prepare to switch compressors', 'Keep people back'];
  }

  if (protocol?.type === 'bleeding') {
    return ['Call 911', 'Bring clean cloth or gauze', 'Press firmly on the wound', 'Watch for shock signs'];
  }

  if (protocol?.type === 'fire' || protocol?.type === 'chemical' || protocol?.type === 'carbon_monoxide' || protocol?.type === 'gas_leak' || protocol?.type === 'powerline') {
    return ['Call 911 from safety', 'Move people away', 'Stop anyone going back', 'Meet responders outside'];
  }

  if (protocol?.type === 'choking') {
    return ['Call 911', 'Clear space around them', 'Watch if they become unconscious', 'Guide the steps aloud'];
  }

  if (protocol?.type === 'unsafe_scene' || behaviorNudge?.module === 'Unsafe scene / law enforcement') {
    return ['Get to safety', 'Call 911 when safe', 'Watch from a distance', 'Keep others back'];
  }

  if (protocol?.type === 'trauma' || behaviorNudge?.module === 'Trauma / rescue') {
    return ['Call 911', 'Find exact location', 'Keep the person still', 'Keep traffic or hazards away'];
  }

  if (protocol?.type === 'medical') {
    return ['Call 911', 'Unlock the door', 'Gather medications nearby', 'Watch breathing'];
  }

  return ['Call 911', 'Find exact location', 'Watch breathing', 'Keep others back'];
}

function assessPersonalSafetyTriage(input: string): { action: 'ask'; question: string; summary: string } | null {
  const normalized = normalizeTriageText(input);
  const possiblePersonalSafetyConcern =
    includesAny(normalized, [
      'following',
      'followed',
      'follow_me',
      'following_me',
      'tailing',
      'trailing',
      'watching_me',
      'staring',
      'suspicious_person',
      'suspicious_vehicle',
      'prowler',
    ]) ||
    /\b(two|2|three|3|men|man|person|people|guy|guys|stranger|strangers)\b/.test(normalized) &&
      /\b(follow|following|behind|watching|staring|suspicious)\b/.test(normalized);

  if (!possiblePersonalSafetyConcern) return null;

  const clearDanger =
    includesAny(normalized, [
      'weapon',
      'gun',
      'knife',
      'armed',
      'threat',
      'threatening',
      'attack',
      'attacked',
      'assault',
      'robbery',
      'kidnap',
      'grabbed',
      'blocked',
      'blocking',
      'cornered',
      'chasing',
      'running_after',
      'cant_leave',
      'cannot_leave',
      'cant_escape',
      'cannot_escape',
      'help_me',
      'right_now',
      'still_following',
      'getting_closer',
    ]) || /\b(can't|cannot|cant)\b.*\b(leave|escape|get_away)\b/.test(normalized);

  if (clearDanger) return null;

  return {
    action: 'ask',
    summary: 'Possible safety concern: asking one follow-up before 911 escalation.',
    question: getDefaultSafetyFollowUp(),
  };
}

function getDefaultSafetyFollowUp() {
  return 'Are they still following you, getting closer, threatening you, blocking you, or keeping you from reaching a safe public place?';
}

function normalizeTriageText(value: string) {
  return value
    .toLowerCase()
    .replace(/can't/g, 'cant')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function includesAny(value: string, patterns: string[]) {
  return patterns.some((pattern) => value.includes(pattern));
}

function getTop911ProtocolOverride(item: Top911Emergency): EmergencyType | undefined {
  if ([1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 13, 14, 15, 17, 18, 49].includes(item.rank)) return 'medical';
  if ([9, 16, 21, 22, 27, 28, 29, 39, 40, 48].includes(item.rank)) return 'trauma';
  if ([19, 23, 25, 26, 30, 41, 42, 43, 44, 45, 46, 47, 50].includes(item.rank)) return 'unsafe_scene';
  if (item.rank === 35) return 'carbon_monoxide';
  if (item.rank === 36) return 'gas_leak';
  if (item.rank === 37) return 'powerline';
  return undefined;
}

function getSpeechLanguage(language: EmergencyLanguageCode) {
  return getEmergencyLanguage(language).ttsLocale;
}

function getLanguageName(language: EmergencyLanguageCode) {
  return getEmergencyLanguage(language).englishName;
}

function getLanguageDirection(language: EmergencyLanguageCode): 'ltr' | 'rtl' {
  const config = getEmergencyLanguage(language);
  return 'rtl' in config && config.rtl ? 'rtl' : 'ltr';
}

function getLanguageHtmlLang(language: EmergencyLanguageCode) {
  return getEmergencyLanguage(language).htmlLang;
}

function getLanguageFontFamily(language: EmergencyLanguageCode) {
  const lang = getEmergencyLanguage(language).translateCode;
  if (['ar-SA', 'ar-EG', 'fa-IR', 'he-IL', 'ur-PK'].includes(lang)) return 'Tahoma, Arial, sans-serif';
  if (['hi-IN', 'bn-IN', 'gu-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'pa-IN', 'ta-IN', 'te-IN'].includes(lang)) return '"Nirmala UI", "Kohinoor Devanagari", Arial, sans-serif';
  if (['zh-CN', 'zh-TW'].includes(lang)) return '"Noto Sans CJK SC", "Microsoft YaHei", Arial, sans-serif';
  if (lang === 'ja-JP') return '"Noto Sans JP", "Yu Gothic", Meiryo, Arial, sans-serif';
  if (lang === 'ko-KR') return '"Noto Sans KR", "Malgun Gothic", Arial, sans-serif';
  if (lang === 'th-TH') return '"Noto Sans Thai", Tahoma, Arial, sans-serif';
  return 'Arial, sans-serif';
}

function createFallbackHtmlHelper(protocol: EmergencyProtocol, step: EmergencyStep): EmergencyHtmlHelper {
  return {
    kicker: 'Checklist helper',
    title: `${protocol.title} helper`,
    subtitle: 'Optional visual helper',
    urgent: 'Use this as a checklist after reading the main step.',
    bullets: [
      'The main step above stays the source of truth.',
      step.detail || 'Stay with the current app step.',
      'Keep your phone on speaker if you can.',
    ],
    avoid: [
      step.altGuidance || 'Do not take unsafe risks.',
      'Dispatcher instructions override this screen.',
    ],
  };
}

function createLanguageHtmlHelper(
  protocol: EmergencyProtocol,
  originalStep: EmergencyStep,
  translatedStep: TranslatedStep,
  language: EmergencyLanguageCode,
): EmergencyHtmlHelper {
  return {
    kicker: 'Language helper',
    dir: getLanguageDirection(language),
    lang: getLanguageHtmlLang(language),
    fontFamily: getLanguageFontFamily(language),
    title: `${getLanguageName(language)} helper`,
    subtitle: protocol.title,
    urgent: translatedStep.instruction,
    bullets: [
      translatedStep.detail || originalStep.detail || '',
      'Use the main red Done button when this step is complete.',
      '911 dispatcher instructions override this helper.',
    ].filter(Boolean),
    avoid: [
      originalStep.altGuidance || 'Do not take unsafe risks.',
    ],
  };
}

function createLanguageFallbackHtmlHelper(step: EmergencyStep, language: EmergencyLanguageCode): EmergencyHtmlHelper {
  return {
    kicker: 'Language helper',
    dir: getLanguageDirection(language),
    lang: getLanguageHtmlLang(language),
    fontFamily: getLanguageFontFamily(language),
    title: `${getLanguageName(language)} helper unavailable`,
    subtitle: 'Gemma translation is not ready.',
    urgent: 'Use the main English step above.',
    bullets: [
      step.instruction,
      step.detail || 'Follow the visible app step and call 911.',
    ],
    avoid: [
      'Do not wait for translation if the person is in immediate danger.',
    ],
  };
}

function createHelperHtml(helper: EmergencyHtmlHelper) {
  const bullets = helper.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  const avoid = helper.avoid.map((item) => `<li>${escapeHtml(item)}</li>`).join('');

  return `<!doctype html>
<html lang="${escapeHtml(helper.lang || 'en')}" dir="${helper.dir || 'ltr'}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ${helper.fontFamily || 'Arial, sans-serif'};
      background: #fff7ed;
      color: #111827;
    }
    main { padding: 18px; }
    .pill {
      display: inline-block;
      border-radius: 999px;
      background: #be123c;
      color: white;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
    }
    h1 { margin: 14px 0 6px; font-size: 26px; line-height: 1.05; }
    p { margin: 0; color: #4b5563; font-size: 14px; line-height: 1.45; }
    .urgent {
      margin-top: 16px;
      border-radius: 18px;
      background: #111827;
      color: white;
      padding: 16px;
      font-size: 22px;
      font-weight: 900;
      line-height: 1.15;
    }
    section {
      margin-top: 12px;
      border: 1px solid #fed7aa;
      border-radius: 18px;
      background: white;
      padding: 14px;
    }
    h2 { margin: 0 0 8px; font-size: 13px; text-transform: uppercase; color: #9f1239; }
    ul { margin: 0; padding-left: 19px; }
    li { margin: 8px 0; font-size: 15px; line-height: 1.35; font-weight: 700; }
  </style>
</head>
<body>
  <main>
    <span class="pill">${escapeHtml(helper.kicker || 'AI helper')}</span>
    <h1>${escapeHtml(helper.title)}</h1>
    <p>${escapeHtml(helper.subtitle || 'Use this as a visual helper. The main app step stays primary.')}</p>
    <div class="urgent">${escapeHtml(helper.urgent)}</div>
    <section>
      <h2>Do</h2>
      <ul>${bullets}</ul>
    </section>
    <section>
      <h2>Avoid</h2>
      <ul>${avoid}</ul>
    </section>
  </main>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatElapsed(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  return formatCoachTime(totalSeconds);
}

function formatClockTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function createResearchProtocol(item: Top911Emergency): EmergencyProtocol {
  const steps: EmergencyStep[] = [
    {
      number: 1,
      instruction: 'Call 911 and give your exact location first.',
      detail: `Say: "${item.title}". Then describe what you see. Primary response is usually ${item.primaryResponse}.`,
      altGuidance: 'If you cannot speak safely, stay connected and follow dispatcher prompts if possible.',
    },
    {
      number: 2,
      instruction: item.firstAction,
      detail: `Caller clues to mention: ${item.clues}`,
      altGuidance: 'If this does not fit what is happening, tell the dispatcher exactly what changed.',
    },
    {
      number: 3,
      instruction: 'Keep yourself safe and stay on the line.',
      detail: 'Move away from danger if you can do so safely. Keep listening for dispatcher instructions.',
      altGuidance: 'Move away from danger if you can do so safely. Do not confront a dangerous person or enter a dangerous scene.',
    },
  ];

  return {
    type: 'unknown',
    title: item.title.toUpperCase(),
    steps,
  };
}
