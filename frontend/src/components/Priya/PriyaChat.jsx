import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Sparkles, ArrowRight } from 'lucide-react';
import PriyaAvatar from './PriyaAvatar';
import {
    PRIYA,
    resolveQuery,
    getTopicsByIds,
    getDefaultSuggestions,
    pickRejection
} from './priyaKnowledge';
import { saveToCache, loadFromCache } from '../../utils/synapseCache';

const CACHE_KEY = 'priya_conversation';
const MAX_STORED_MESSAGES = 40;

let messageSeq = 0;
const nextId = () => `priya-msg-${Date.now()}-${messageSeq++}`;

/**
 * Renders the light markdown Priya's answers use: **bold**, *italic* and newlines.
 */
const formatRich = (text) =>
    String(text)
        .split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
        .filter((part) => part !== '')
        .map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return (
                    <strong key={index} className="font-semibold text-white">
                        {part.slice(2, -2)}
                    </strong>
                );
            }
            if (part.startsWith('*') && part.endsWith('*')) {
                return (
                    <em key={index} className="italic">
                        {part.slice(1, -1)}
                    </em>
                );
            }
            return <span key={index}>{part}</span>;
        });

/** Three bouncing dots while Priya "thinks". */
const TypingDots = () => (
    <div className="flex items-center gap-1 px-1 py-0.5">
        {[0, 1, 2].map((index) => (
            <motion.span
                key={index}
                className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
                transition={{ duration: 1, delay: index * 0.15, repeat: Infinity, ease: 'easeInOut' }}
            />
        ))}
    </div>
);
const MessageBubble = ({ message, onAction }) => {
    const isPriya = message.role === 'priya';
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={`flex w-full gap-2 ${isPriya ? 'justify-start' : 'justify-end'}`}
        >
            {isPriya && (
                <div className="mt-1 shrink-0">
                    <PriyaAvatar size={28} animated={false} showRing={false} />
                </div>
            )}

            <div className="max-w-[82%]">
                <div
                    className={
                        isPriya
                            ? 'rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-[13px] leading-relaxed text-gray-200'
                            : 'rounded-2xl rounded-br-sm bg-emerald-500 px-3.5 py-2.5 text-[13px] font-medium leading-relaxed text-black'
                    }
                >
                    <p className="whitespace-pre-line break-words">{formatRich(message.text)}</p>
                </div>

                {message.action && onAction && (
                    <button
                        onClick={() => onAction(message.action)}
                        className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-300 transition-colors hover:bg-emerald-500/20"
                    >
                        {message.action.label}
                        <ArrowRight size={12} />
                    </button>
                )}
            </div>
        </motion.div>
    );
};
const PriyaChat = ({ onClose, onNavigate }) => {
    const [messages, setMessages] = useState(() => {
        const cached = loadFromCache(CACHE_KEY);
        if (Array.isArray(cached) && cached.length) return cached;
        // Start from her intro so the panel is never briefly empty.
        return [{ id: nextId(), role: 'priya', text: PRIYA.intro }];
    });
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [suggestions, setSuggestions] = useState(() => getDefaultSuggestions());

    const rejectionCount = useRef(0);
    const timers = useRef([]);
    const scrollRef = useRef(null);
    const inputRef = useRef(null);

    // Every reply delay is tracked so nothing fires after she is unmounted.
    const schedule = useCallback((fn, delay) => {
        const id = setTimeout(fn, delay);
        timers.current.push(id);
        return id;
    }, []);

    useEffect(() => () => timers.current.forEach(clearTimeout), []);

    // Keep the conversation across reloads, using the app's existing cache helper.
    useEffect(() => {
        if (messages.length) saveToCache(CACHE_KEY, messages.slice(-MAX_STORED_MESSAGES));
    }, [messages]);

    useEffect(() => {
        const node = scrollRef.current;
        if (node) node.scrollTop = node.scrollHeight;
    }, [messages, isTyping]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        const handleKey = (event) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);
const answerTopic = (topic) => {
        setIsTyping(true);
        setSuggestions([]);
        const followUps = getTopicsByIds(topic.followUps || []);
        // A short, slightly random pause makes her feel like she is thinking.
        schedule(() => {
            setIsTyping(false);
            setMessages((prev) => [
                ...prev,
                { id: nextId(), role: 'priya', text: topic.answer, action: topic.action || null }
            ]);
            setSuggestions(followUps.length ? followUps : getDefaultSuggestions());
        }, 620 + Math.random() * 420);
    };

    const handleTopicClick = (topic) => handleSubmit(topic.question, topic);

    const handleSubmit = (rawText, knownTopic = null) => {
        const text = String(rawText ?? input).trim();
        if (!text || isTyping) return;

        setInput('');
        setMessages((prev) => [...prev, { id: nextId(), role: 'user', text }]);

        // A tapped chip already knows its topic, so there is nothing to guess.
        if (knownTopic) {
            answerTopic(knownTopic);
            return;
        }

        const result = resolveQuery(text);

        if (result.type === 'topic') {
            answerTopic(result.topic);
            return;
        }

        if (result.type === 'smalltalk') {
            setIsTyping(true);
            setSuggestions([]);
            schedule(() => {
                setIsTyping(false);
                setMessages((prev) => [
                    ...prev,
                    { id: nextId(), role: 'priya', text: PRIYA.smalltalkReplies[result.kind] }
                ]);
                setSuggestions(getDefaultSuggestions());
            }, 500 + Math.random() * 350);
            return;
        }

        // Out of scope: refuse politely, then re-offer the questions she can answer.
        setIsTyping(true);
        setSuggestions([]);
        const attempt = rejectionCount.current;
        rejectionCount.current += 1;
        schedule(() => {
            setIsTyping(false);
            setMessages((prev) => [
                ...prev,
                { id: nextId(), role: 'priya', text: pickRejection(attempt) }
            ]);
            setSuggestions(getDefaultSuggestions());
        }, 520 + Math.random() * 380);
    };

    const handleAction = (action) => {
        if (action && action.type === 'navigate' && onNavigate) onNavigate(action.view);
    };
return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3">
                <PriyaAvatar size={40} />
                <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-white">
                        {PRIYA.name}
                        <Sparkles size={12} className="text-emerald-400" />
                    </p>
                    <p className="truncate text-[10px] text-emerald-400/80">{PRIYA.status}</p>
                </div>
                <button
                    onClick={onClose}
                    aria-label="Close chat"
                    className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Conversation */}
            <div ref={scrollRef} className="hide-scrollbar flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} onAction={handleAction} />
                ))}

                {isTyping && (
                    <div className="flex items-center gap-2">
                        <PriyaAvatar size={28} animated={false} showRing={false} />
                        <div className="rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.06] px-3.5 py-2">
                            <TypingDots />
                        </div>
                    </div>
                )}
            </div>
{/* Quick replies — the fixed questions she is allowed to answer */}
            {suggestions.length > 0 && !isTyping && (
                <div className="hide-scrollbar max-h-32 shrink-0 overflow-y-auto border-t border-white/5 px-3 py-2">
                    <p className="mb-1.5 px-1 text-[9px] font-bold uppercase tracking-widest text-gray-500">
                        Ask about
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {suggestions.map((topic) => (
                            <button
                                key={topic.id}
                                onClick={() => handleTopicClick(topic)}
                                className="rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] px-3 py-1.5 text-[11px] font-medium text-emerald-200 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/15"
                            >
                                {topic.chip}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Composer */}
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    handleSubmit();
                }}
                className="shrink-0 border-t border-white/10 bg-white/[0.03] px-3 py-3"
            >
                <div className="flex items-center gap-2">
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        placeholder="Ask about SynapseX..."
                        className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-[13px] text-white outline-none transition-colors placeholder:text-gray-500 focus:border-emerald-500/50"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isTyping}
                        aria-label="Send message"
                        className="shrink-0 rounded-full bg-emerald-500 p-2.5 text-black transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                        <Send size={16} />
                    </button>
                </div>
                <p className="mt-2 px-1 text-center text-[9px] text-gray-600">
                    Priya only answers SynapseX questions.
                </p>
            </form>
        </div>
    );
};

export default PriyaChat;
