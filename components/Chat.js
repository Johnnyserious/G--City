'use client';
import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import { sfx } from '@/lib/sound';

const EMOJIS = ['😂', '🔥', '👏', '😱', '🤯', '💀', '🙈', '🎉', '😤', '🧠', '👀', '🤡'];

export default function Chat({ room, me }) {
  const { messages, reactions, sendChat, sendReaction } = room;
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [text, setText] = useState('');
  const [seen, setSeen] = useState(0);
  const listRef = useRef(null);
  const lastCount = useRef(messages.length);
  const [floating, setFloating] = useState([]);
  const seenReacts = useRef(new Set());

  useEffect(() => {
    if (messages.length > lastCount.current) {
      const last = messages[messages.length - 1];
      if (last.pid !== me.id) sfx.chat();
    }
    lastCount.current = messages.length;
    if (open) setSeen(messages.length);
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open, me.id]);

  useEffect(() => {
    const fresh = reactions.filter((r) => !seenReacts.current.has(r.id));
    if (!fresh.length) return;
    fresh.forEach((r) => seenReacts.current.add(r.id));
    setFloating((f) => [...f, ...fresh]);
    fresh.forEach((r) => setTimeout(() => setFloating((f) => f.filter((x) => x.id !== r.id)), 2700));
  }, [reactions]);

  const unread = Math.max(0, messages.length - seen);
  const submit = () => {
    if (!text.trim()) return;
    sendChat(text.trim());
    setText('');
  };

  return (
    <>
      {floating.map((r) => (
        <div key={r.id} className="float-react" style={{ left: r.x + '%' }}>{r.emoji}</div>
      ))}
      {!hidden && (
        <button className="chat-fab" onClick={() => { sfx.click(); setOpen(!open); setSeen(messages.length); }} aria-label="Chat">
          {open ? '✕' : '💬'}
          {!open && unread > 0 && <span className="badge">{unread}</span>}
        </button>
      )}
      {hidden && (
        <button className="chat-fab" style={{ width: 36, height: 36, fontSize: 16, borderRadius: 12, opacity: 0.6 }} onClick={() => setHidden(false)} aria-label="Chat zeigen">💬</button>
      )}
      {open && !hidden && (
        <div className="chat-panel">
          <div className="chat-head">
            <b className="display" style={{ fontSize: 20 }}>Chat</b>
            <div className="row" style={{ gap: 6 }}>
              <button className="icon-btn" style={{ width: 36, height: 36, fontSize: 14 }} title="Chat ganz ausblenden" onClick={() => { setHidden(true); setOpen(false); }}>🙈</button>
              <button className="icon-btn" style={{ width: 36, height: 36, fontSize: 14 }} onClick={() => setOpen(false)}>✕</button>
            </div>
          </div>
          <div className="chat-msgs" ref={listRef}>
            {messages.length === 0 && <div className="muted center" style={{ marginTop: 30, fontWeight: 700 }}>Noch ruhig hier … schick was 😎</div>}
            {messages.map((m) => (
              <div key={m.id} className={'msg' + (m.pid === me.id ? ' me' : '')}>
                <Avatar avatar={m.avatar} size={28} />
                <div className="bubble">
                  {m.pid !== me.id && <div className="who">{m.name}</div>}
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div className="emoji-bar">
            {EMOJIS.map((e) => (
              <button key={e} onClick={() => { sfx.pop(); sendReaction(e); }}>{e}</button>
            ))}
          </div>
          <div className="chat-input">
            <input value={text} maxLength={200} placeholder="Nachricht …" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
            <button className="btn small teal" onClick={submit}>➜</button>
          </div>
        </div>
      )}
      {!open && !hidden && (
        <div style={{ position: 'fixed', right: 86, bottom: 22, zIndex: 49, display: 'flex', gap: 2 }}>
          {['😂', '🔥', '😱', '👏'].map((e) => (
            <button key={e} onClick={() => { sfx.pop(); sendReaction(e); }} style={{ background: 'var(--card)', borderRadius: 12, fontSize: 22, width: 42, height: 42, boxShadow: '0 4px 0 #160e45' }}>{e}</button>
          ))}
        </div>
      )}
    </>
  );
}
