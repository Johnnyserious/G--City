'use client';
import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import EmojiPicker from './EmojiPicker';
import { sfx, haptic } from '@/lib/sound';
import { recordEmoji } from '@/lib/emojiUse';

// Feste Reihenfolge (Jonas' Wunsch): die Leiste springt nicht um, man kann draufhämmern
const QUICK = ['😂', '🔥', '💀', '😭', '👏'];
const BAR = ['😂', '🔥', '💀', '😭', '👏', '😱'];

// Chat unten LINKS (rechts liegen meist die Spiel-Knöpfe). Daneben die eigenen Lieblings-Emojis als
// schnelle Reaktionen, ＋ öffnet alle Emojis.
export default function Chat({ room, me }) {
  const { messages, reactions, sendChat, sendReaction } = room;
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [text, setText] = useState('');
  const [seen, setSeen] = useState(0);
  const [picker, setPicker] = useState(null); // 'react' | 'text'
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const lastCount = useRef(messages.length);
  const [floating, setFloating] = useState([]);
  const seenReacts = useRef(new Set());


  useEffect(() => {
    if (messages.length > lastCount.current) {
      const last = messages[messages.length - 1];
      if (last.pid !== me.id) { sfx.chat(); haptic('tap'); }
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
    sfx.soft();
    haptic('tap');
    inputRef.current?.focus();
  };
  const react = (e) => {
    recordEmoji(e);
    sfx.pop();
    haptic('tap');
    sendReaction(e);
  };

  return (
    <>
      {floating.map((r) => (
        <div key={r.id} className="float-react" style={{ left: r.x + '%' }}>{r.emoji}</div>
      ))}
      {!hidden && (
        <button className="chat-fab" onClick={() => { sfx.click(); haptic('tap'); setOpen(!open); setSeen(messages.length); }} aria-label="Chat">
          {open ? '✕' : '💬'}
          {!open && unread > 0 && <span className="badge">{unread}</span>}
        </button>
      )}
      {hidden && (
        <button className="chat-fab chat-fab-mini" onClick={() => setHidden(false)} aria-label="Chat zeigen">💬</button>
      )}
      {!open && !hidden && (
        <div className="quick-react">
          {QUICK.map((e) => (
            <button key={e} onClick={() => react(e)} aria-label={'Reaktion ' + e}>{e}</button>
          ))}
          <button className="qr-plus" onClick={() => { sfx.click(); setPicker('react'); }} aria-label="Alle Emojis">＋</button>
        </div>
      )}
      {open && !hidden && (
        <div className="chat-panel">
          <div className="chat-head">
            <b className="display" style={{ fontSize: 20 }}>Chat</b>
            <div className="row" style={{ gap: 6 }}>
              <button className="icon-btn" style={{ width: 40, height: 40, fontSize: 15 }} title="Chat ganz ausblenden" onClick={() => { setHidden(true); setOpen(false); }}>🙈</button>
              <button className="icon-btn" style={{ width: 40, height: 40, fontSize: 15 }} onClick={() => setOpen(false)} aria-label="Chat schließen">✕</button>
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
            {BAR.map((e) => (
              <button key={e} onClick={() => { recordEmoji(e); setText((t) => t + e); haptic('tap'); }}>{e}</button>
            ))}
            <button className="qr-plus" onClick={() => setPicker('text')} aria-label="Alle Emojis">＋</button>
          </div>
          <div className="chat-input">
            <input ref={inputRef} value={text} maxLength={200} placeholder="Nachricht …" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} enterKeyHint="send" />
            <button className="send-btn" onClick={submit} disabled={!text.trim()} aria-label="Senden">➤</button>
          </div>
        </div>
      )}
      {picker && (
        <EmojiPicker
          title={picker === 'react' ? 'Reaktion schicken' : 'Emoji einfügen'}
          onClose={() => setPicker(null)}
          onPick={(e) => {
            if (picker === 'react') { sendReaction(e); setPicker(null); }
            else setText((t) => t + e);
          }}
        />
      )}
    </>
  );
}
