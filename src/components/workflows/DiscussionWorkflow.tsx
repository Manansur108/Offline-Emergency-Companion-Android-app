import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, Mic, MessageCircle, Send, Square, Trash2, Volume2, VolumeX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { WorkflowOutput } from './WorkflowOutput';
import { askOfflineModel, newMessage, type ChatMessage } from '../../services/aiEngine';
import { addWorkflowRun } from '../../services/workflowHistory';
import { isRecord, readJson, removeStorageItem, writeJson } from '../../services/storage';
import { VoiceIO, type VoiceStatus } from '../../plugins/voiceIO';
import type { WorkflowTemplate } from '../../types/workflows';

interface DiscussionState {
  messages: ChatMessage[];
  draft: string;
  insights: string;
  voiceReply: boolean;
}

const DISCUSSION_KEY = 'ai-offline-base.discussion-workflow';
const MAX_DISCUSSION_MESSAGES = 80;

export function DiscussionWorkflow({ workflow }: { workflow: WorkflowTemplate }) {
  const [state, setState] = useState<DiscussionState>(() => loadDiscussionState());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus | null>(null);
  const [voiceError, setVoiceError] = useState('');
  const canSend = state.draft.trim().length > 0 && !isGenerating;

  const conversationText = useMemo(
    () => state.messages.map((message) => `${message.role}: ${message.content}`).join('\n\n'),
    [state.messages],
  );

  useEffect(() => {
    saveDiscussionState(state);
  }, [state]);

  useEffect(() => {
    let isMounted = true;
    VoiceIO.getStatus()
      .then((status) => {
        if (isMounted) setVoiceStatus(status);
      })
      .catch((error) => {
        if (isMounted) {
          setVoiceError(error instanceof Error ? error.message : 'Voice status is unavailable.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = state.draft.trim();
    if (!query || isGenerating) return;

    const userMessage = newMessage('user', query);
    const nextMessages = [...state.messages, userMessage].slice(-MAX_DISCUSSION_MESSAGES);

    setState((current) => ({
      ...current,
      draft: '',
      messages: nextMessages,
    }));
    setIsGenerating(true);

    try {
      const context = nextMessages
        .slice(-10)
        .map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`)
        .join('\n');
      const result = await askOfflineModel(
        [
          'Continue this saved offline discussion.',
          'Answer the newest user message clearly with high-signal guidance, practical steps, and plain language.',
          'Keep the response voice-friendly and natural: no Markdown headings, no hash symbols, no tables, and one follow-up question only when it helps.',
          context,
        ].join('\n\n'),
      );

      if (state.voiceReply) {
        speakText(result.text);
      }

      setState((current) => ({
        ...current,
        messages: [...current.messages, newMessage('assistant', result.text)].slice(-MAX_DISCUSSION_MESSAGES),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The offline model could not continue the discussion.';
      setState((current) => ({
        ...current,
        messages: [...current.messages, newMessage('assistant', message)].slice(-MAX_DISCUSSION_MESSAGES),
      }));
    } finally {
      setIsGenerating(false);
    }
  }

  async function generateInsights() {
    if (!conversationText.trim() || isGeneratingInsights) return;

    setIsGeneratingInsights(true);

    try {
      const result = await askOfflineModel(
        workflow.buildPrompt({
          fields: { discussion: conversationText },
          options: {},
        }),
      );

      setState((current) => ({ ...current, insights: result.text }));
      addWorkflowRun({
        workflowId: workflow.id,
        workflowTitle: workflow.title,
        input: { topic: summarizeConversation(conversationText) },
        output: result.text,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The offline model could not summarize this discussion.';
      setState((current) => ({ ...current, insights: message }));
    } finally {
      setIsGeneratingInsights(false);
    }
  }

  function clearConversation() {
    removeStorageItem(DISCUSSION_KEY);
    setState({ messages: [], draft: '', insights: '', voiceReply: state.voiceReply });
  }

  async function listenForDraft() {
    if (isListening) return;

    setVoiceError('');
    setIsListening(true);

    try {
      const result = await VoiceIO.startListening({
        language: 'en-US',
        prompt: 'Ask the offline model',
      });
      if (result.text.trim()) {
        setState((current) => ({
          ...current,
          draft: [current.draft.trim(), result.text.trim()].filter(Boolean).join(' '),
        }));
      }
    } catch (error) {
      setVoiceError(error instanceof Error ? error.message : 'Speech to text failed.');
    } finally {
      setIsListening(false);
    }
  }

  async function speakText(text: string) {
    const spokenText = text.trim();
    if (!spokenText) return;

    setVoiceError('');
    setIsSpeaking(true);

    try {
      await VoiceIO.speak({
        text: spokenText.slice(0, 3000),
        language: 'en-US',
        rate: 0.96,
        pitch: 1,
      });
    } catch (error) {
      setVoiceError(error instanceof Error ? error.message : 'Text to speech failed.');
      setIsSpeaking(false);
    }
  }

  async function stopSpeaking() {
    await VoiceIO.stopSpeaking();
    setIsSpeaking(false);
  }

  function speakLastAssistantMessage() {
    const lastAssistantMessage = [...state.messages].reverse().find((message) => message.role === 'assistant');
    if (lastAssistantMessage) {
      speakText(lastAssistantMessage.content);
    }
  }

  return (
    <div className="space-y-5 pt-4">
      <header className="space-y-3">
        <Link to="/workflows" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
          <ArrowLeft size={16} aria-hidden="true" />
          Workflows
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">{workflow.state}</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-950">{workflow.title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">{workflow.description}</p>
          </div>
          {state.messages.length > 0 || state.insights ? (
            <button
              type="button"
              onClick={clearConversation}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-white/70 hover:text-rose-600"
              aria-label="Delete saved discussion"
            >
              <Trash2 size={18} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </header>

      <Card className="p-4 rounded-[1.25rem]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-base font-bold text-slate-950">Saved conversation</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={isSpeaking ? stopSpeaking : speakLastAssistantMessage}
              disabled={!isSpeaking && !state.messages.some((message) => message.role === 'assistant')}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-primary transition hover:bg-primary/10 disabled:opacity-40"
              aria-label={isSpeaking ? 'Stop speaking' : 'Speak last answer'}
            >
              {isSpeaking ? <VolumeX size={17} aria-hidden="true" /> : <Volume2 size={17} aria-hidden="true" />}
            </button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              rounded="2xl"
              disabled={state.messages.length === 0 || isGeneratingInsights}
              isLoading={isGeneratingInsights}
              onClick={generateInsights}
              className="min-h-10 px-3 text-xs"
            >
              Insights
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 rounded-2xl bg-white/60 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-800">Voice mode</p>
              <p className="text-xs leading-5 text-slate-500">
                STT {voiceStatus?.sttAvailable ? 'ready' : 'checking'} · TTS {voiceStatus?.ttsAvailable ? 'ready' : 'checking'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setState((current) => ({ ...current, voiceReply: !current.voiceReply }))}
              className={
                state.voiceReply
                  ? 'relative h-8 w-14 shrink-0 rounded-full bg-primary transition'
                  : 'relative h-8 w-14 shrink-0 rounded-full bg-slate-300 transition dark:bg-slate-700'
              }
              aria-pressed={state.voiceReply}
              aria-label={state.voiceReply ? 'Voice replies on' : 'Voice replies off'}
            >
              <span
                className={
                  state.voiceReply
                    ? 'absolute right-1 top-1 h-6 w-6 rounded-full bg-white shadow transition'
                    : 'absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow transition'
                }
              />
            </button>
          </div>
          {voiceError ? <p className="text-xs leading-5 text-rose-600">{voiceError}</p> : null}
        </div>

        <div className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
          {state.messages.length === 0 ? (
            <p className="rounded-2xl bg-white/60 px-4 py-5 text-sm leading-6 text-slate-500">
              Start a discussion here. Messages stay saved locally when you switch tabs.
            </p>
          ) : (
            state.messages.map((message) => (
              <article key={message.id} className={message.role === 'user' ? 'pl-8' : 'pr-8'}>
                <div
                  className={
                    message.role === 'user'
                      ? 'rounded-[1.25rem] bg-slate-900 px-4 py-3 text-white'
                      : 'rounded-[1.25rem] bg-white/70 px-4 py-3 text-slate-700'
                  }
                >
                  <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                </div>
              </article>
            ))
          )}

          {isGenerating ? (
            <div className="flex items-center gap-3 rounded-2xl bg-white/70 px-4 py-3 text-sm font-medium text-slate-600">
              <Square className="h-4 w-4 animate-pulse fill-primary text-primary" aria-hidden="true" />
              Thinking locally
            </div>
          ) : null}
        </div>

        <form onSubmit={sendMessage} className="mt-4 space-y-3">
          <label className="sr-only" htmlFor="discussion-input">
            Discussion message
          </label>
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={listenForDraft}
              disabled={isListening || isGenerating}
              className={
                isListening
                  ? 'mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/30'
                  : 'mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-primary shadow-sm transition active:scale-95 disabled:opacity-50'
              }
              aria-label={isListening ? 'Listening' : 'Start speech to text'}
            >
              <Mic size={18} aria-hidden="true" />
            </button>
            <textarea
              id="discussion-input"
              value={state.draft}
              onChange={(event) => setState((current) => ({ ...current, draft: event.target.value }))}
              rows={3}
              placeholder="Ask a question, explore an idea, or continue the saved discussion..."
              className="min-w-0 flex-1 resize-none rounded-2xl border border-teal-900/10 bg-white/80 px-4 py-3 text-base leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-teal-700"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-slate-400">
              {isListening ? 'Listening...' : `${state.messages.length} saved messages`}
            </span>
            <Button type="submit" size="sm" disabled={!canSend} isLoading={isGenerating} className="min-h-11 gap-2">
              <Send size={16} aria-hidden="true" />
              Send
            </Button>
          </div>
        </form>
      </Card>

      <WorkflowOutput
        output={state.insights}
        label={workflow.outputLabel}
        isLoading={isGeneratingInsights}
        emptyTitle="No discussion insights yet"
        emptyDescription="Tap Insights after a few messages to get key questions, answers, decisions, and next actions."
      />
    </div>
  );
}

function loadDiscussionState(): DiscussionState {
  const state = readJson<DiscussionState>(
    DISCUSSION_KEY,
    { messages: [], draft: '', insights: '', voiceReply: false },
    isDiscussionState,
  );

  return {
    ...state,
    voiceReply: Boolean(state.voiceReply),
  };
}

function saveDiscussionState(state: DiscussionState): void {
  writeJson(DISCUSSION_KEY, state);
}

function isDiscussionState(value: unknown): value is DiscussionState {
  return (
    isRecord(value) &&
    Array.isArray(value.messages) &&
    value.messages.every(isChatMessage) &&
    typeof value.draft === 'string' &&
    typeof value.insights === 'string' &&
    (typeof value.voiceReply === 'boolean' || typeof value.voiceReply === 'undefined')
  );
}

function isChatMessage(value: unknown): value is ChatMessage {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    (value.role === 'user' || value.role === 'assistant') &&
    typeof value.content === 'string' &&
    typeof value.createdAt === 'string'
  );
}

function summarizeConversation(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 160) || 'Saved discussion';
}
