import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { ConversationSummary, MessageDto } from '@mentora/shared';
import { apiRequest, ApiError } from '../lib/api';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import {
  SearchIcon,
  ChevronLeftIcon,
  SendIcon,
  NoteIcon,
  DotsIcon,
  PhoneIcon,
  VideoIcon,
  ShieldCheckIcon,
  CalendarIcon,
  XIcon,
  CheckIcon,
} from '../components/Icons';

type Tab = 'all' | 'unread' | 'archived';

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const diffDays = Math.round((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function tutorMeta(tutorId: string) {
  void tutorId;
  return { title: null, photo: null };
}

export function MessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageDto[] | null>(null);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [composerText, setComposerText] = useState('');
  const [sending, setSending] = useState(false);
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [students, setStudents] = useState<{ id: string; fullName: string }[]>([]);
  const [noteStudentId, setNoteStudentId] = useState('');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [actionError, setActionError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  function loadConversations() {
    return apiRequest<{ conversations: ConversationSummary[] }>('/api/messages/conversations')
      .then((res) => {
        const list = res.data?.conversations ?? [];
        setConversations(list);
        return list;
      })
      .catch(() => {
        setConversations([]);
        return [];
      });
  }

  useEffect(() => {
    loadConversations().then((list) => {
      const tutorParam = searchParams.get('tutor');
      if (tutorParam) {
        setActionError('');
        apiRequest<{ conversation: ConversationSummary }>('/api/messages/conversations', {
          method: 'POST',
          body: JSON.stringify({ counterpartId: tutorParam }),
        })
          .then((res) => {
            if (res.data?.conversation) {
              setSelectedId(res.data.conversation.id);
              loadConversations();
            }
          })
          .catch((err) => setActionError(err instanceof ApiError ? err.message : 'Could not start this conversation.'))
          .finally(() => setSearchParams({}, { replace: true }));
      } else if (list.length > 0) {
        setSelectedId(list[0].id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setMessages(null);
      return;
    }
    setMessages(null);
    apiRequest<{ messages: MessageDto[] }>(`/api/messages/conversations/${selectedId}/messages`)
      .then((res) => {
        setMessages(res.data?.messages ?? []);
        setConversations((prev) => prev?.map((c) => (c.id === selectedId ? { ...c, unreadCount: 0 } : c)) ?? prev);
      })
      .catch(() => setMessages([]));
    apiRequest<{ students: { id: string; fullName: string }[] }>(`/api/messages/conversations/${selectedId}/students`)
      .then((res) => setStudents(res.data?.students ?? []))
      .catch(() => setStudents([]));
    setNoteStudentId('');
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const selected = conversations?.find((c) => c.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    if (!conversations) return [];
    let list = conversations;
    if (tab === 'unread') list = list.filter((c) => c.unreadCount > 0);
    if (tab === 'archived') return [];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.counterpart.name.toLowerCase().includes(q) || c.lastMessagePreview.toLowerCase().includes(q));
    }
    return list;
  }, [conversations, tab, search]);

  const unreadTotal = conversations?.filter((c) => c.unreadCount > 0).length ?? 0;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !composerText.trim() || sending) return;
    setSending(true);
    setActionError('');
    const body = composerText.trim();
    const studentId = noteStudentId || undefined;
    try {
      const res = await apiRequest<{ message: MessageDto }>(`/api/messages/conversations/${selectedId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body, studentId }),
      });
      if (res.data?.message) {
        setMessages((prev) => (prev ? [...prev, res.data!.message] : [res.data!.message]));
        setComposerText('');
        setNoteStudentId('');
        setConversations((prev) =>
          prev
            ? prev
                .map((c) => (c.id === selectedId ? { ...c, lastMessagePreview: body, lastMessageAt: res.data!.message.createdAt } : c))
                .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
            : prev
        );
      }
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Message could not be sent. Please try again.');
    } finally {
      setSending(false);
    }
  }

  async function startConversationWith(tutorId: string) {
    setActionError('');
    try {
      const res = await apiRequest<{ conversation: ConversationSummary }>('/api/messages/conversations', {
        method: 'POST',
        body: JSON.stringify({ counterpartId: tutorId }),
      });
      if (res.data?.conversation) {
        setSelectedId(res.data.conversation.id);
        await loadConversations();
      }
      setNewMessageOpen(false);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not start this conversation.');
    }
  }

  return (
    <div className="msgs-page">
      <div className="msgs-header">
        <div>
          <h1>Messages</h1>
          <p className="booking-section-hint">Chat with tutors and manage your conversations.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setNewMessageOpen(true)}>
          <SendIcon /> New Message
        </button>
      </div>

      {actionError && <p className="photo-uploader-error" role="alert">{actionError}</p>}

      <div className="msgs-layout">
        <div className="msgs-list-panel">
          <div className="msgs-search">
            <SearchIcon />
            <input type="text" placeholder="Search messages..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="msgs-tabs">
            <button type="button" className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>All</button>
            <button type="button" className={tab === 'unread' ? 'active' : ''} onClick={() => setTab('unread')}>
              Unread {unreadTotal > 0 && <span className="msgs-tab-badge">{unreadTotal}</span>}
            </button>
            <button type="button" className={tab === 'archived' ? 'active' : ''} onClick={() => setTab('archived')}>Archived</button>
          </div>

          {tab === 'archived' ? (
            <div className="msgs-empty-inline">Archiving conversations isn't available yet.</div>
          ) : conversations === null ? null : filtered.length === 0 ? (
            <div className="msgs-empty-inline">
              {conversations.length === 0 ? "You haven't started any conversations yet." : 'No conversations match.'}
            </div>
          ) : (
            <div className="msgs-conv-list">
              {filtered.map((c) => {
                const meta = tutorMeta(c.counterpart.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={c.id === selectedId ? 'msgs-conv-row active' : 'msgs-conv-row'}
                    onClick={() => setSelectedId(c.id)}
                  >
                    <Avatar name={c.counterpart.name} photoUrl={c.counterpart.photoUrl ?? meta.photo} className="msgs-conv-avatar" />
                    <div className="msgs-conv-info">
                      <div className="msgs-conv-top">
                        <strong>{c.counterpart.name}</strong>
                        <span className="msgs-conv-time">{formatTime(c.lastMessageAt)}</span>
                      </div>
                      <p>{c.lastMessagePreview || 'Say hello to get started'}</p>
                    </div>
                    {c.unreadCount > 0 && <span className="msgs-conv-badge">{c.unreadCount}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="msgs-thread-panel">
          {!selected ? (
            <div className="msgs-thread-empty">
              <Link to="/dashboard/tutors" className="tprofile-back"><ChevronLeftIcon /> Back to dashboard</Link>
              <p>Select a conversation or start a new one to begin chatting with a tutor.</p>
            </div>
          ) : (
            <>
              <div className="msgs-thread-header">
                <Avatar name={selected.counterpart.name} photoUrl={selected.counterpart.photoUrl ?? tutorMeta(selected.counterpart.id).photo} className="msgs-conv-avatar" />
                <div className="msgs-thread-header-info">
                  <strong>{selected.counterpart.name}</strong>
                  <span>{tutorMeta(selected.counterpart.id).title ?? 'Tutor'}</span>
                </div>
                <button type="button" className="msgs-icon-btn" disabled title="Video calling coming soon"><VideoIcon /></button>
                <button type="button" className="msgs-icon-btn" disabled title="Voice calling coming soon"><PhoneIcon /></button>
                <Link to={`/dashboard/tutors/${selected.counterpart.id}`} className="msgs-icon-btn" title="View tutor profile"><DotsIcon /></Link>
              </div>

              <div className="msgs-safety-banner">
                <ShieldCheckIcon />
                <span>Keep your conversations safe. Never share personal information or make payments outside Mentora.</span>
              </div>

              <div className="msgs-thread-body">
                {messages === null ? null : (
                  <>
                    {messages.map((m) => (
                      <div key={m.id} className={m.senderIsMe ? 'msgs-bubble-row me' : 'msgs-bubble-row'}>
                        <div className="msgs-bubble">
                          {m.studentName && (
                            <span className="msgs-note-tag"><NoteIcon /> Note about {m.studentName}</span>
                          )}
                          <p>{m.body}</p>
                          <span className="msgs-bubble-time">
                            {formatTime(m.createdAt)}
                            {m.senderIsMe && m.readAt && <CheckIcon />}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              <form className="msgs-composer" onSubmit={handleSend}>
                {students.length > 0 && (
                  <select value={noteStudentId} onChange={(e) => setNoteStudentId(e.target.value)} className="msgs-student-picker" title="Tag this message about a child">
                    <option value="">General message</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>About {s.fullName}</option>
                    ))}
                  </select>
                )}
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                />
                <button type="submit" className="msgs-send-btn" disabled={!composerText.trim() || sending} aria-label="Send message">
                  <SendIcon />
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {!bannerDismissed && (
        <div className="dash-sticky-banner">
          <span className="dash-sticky-icon"><CalendarIcon /></span>
          <div className="dash-sticky-copy">
            <strong>Stay organized</strong>
            <span>View your upcoming sessions and never miss a class.</span>
          </div>
          <Link to="/dashboard/bookings" className="btn btn-primary">View My Bookings <span aria-hidden="true">→</span></Link>
          <button type="button" className="dash-sticky-close" aria-label="Dismiss" onClick={() => setBannerDismissed(true)}><XIcon /></button>
        </div>
      )}

      {newMessageOpen && (
        <NewMessageModal onClose={() => setNewMessageOpen(false)} onPick={startConversationWith} existingTutorIds={conversations?.map((c) => c.counterpart.id) ?? []} />
      )}
    </div>
  );
}

function NewMessageModal({
  onClose,
  onPick,
  existingTutorIds,
}: {
  onClose: () => void;
  onPick: (tutorId: string) => void;
  existingTutorIds: string[];
}) {
  const [query, setQuery] = useState('');
  const [tutors, setTutors] = useState<{ id: string; name: string; photoUrl: string | null; title: string | null }[] | null>(null);
  useEffect(() => {
    apiRequest<{ tutors: { id: string; name: string; photoUrl: string | null; title: string | null }[] }>('/api/messages/messageable-tutors')
      .then((res) => setTutors(res.data?.tutors ?? []))
      .catch(() => setTutors([]));
  }, []);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (tutors ?? []).filter((t) => !q || t.name.toLowerCase().includes(q) || (t.title ?? '').toLowerCase().includes(q)).slice(0, 20);
  }, [query, tutors]);

  return (
    <Modal title="New Message" onClose={onClose}>
      <div className="msgs-newmsg-search">
        <SearchIcon />
        <input type="text" placeholder="Search tutors..." value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
      </div>
      <div className="msgs-newmsg-list">
        {tutors === null && <p className="booking-section-hint">Loading tutors you have booked...</p>}
        {tutors !== null && results.length === 0 && <p className="booking-section-hint">Book a tutor before starting a conversation.</p>}
        {results.map((t) => (
          <button key={t.id} type="button" className="msgs-newmsg-row" onClick={() => onPick(t.id)}>
            <Avatar name={t.name} photoUrl={t.photoUrl} className="msgs-conv-avatar" />
            <div className="msgs-conv-info">
              <strong>{t.name}</strong>
              <p>{t.title}{existingTutorIds.includes(t.id) ? ' · Conversation already started' : ''}</p>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}
