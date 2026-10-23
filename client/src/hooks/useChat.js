'use client';
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

export function useChat() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'Assalamu Alaikum! Ready to start the debate?',
      sender: 'other',
    },
    {
      id: 2,
      text: "Wa Alaikum Assalam! Yes, let's begin Insha'Allah.",
      sender: 'me',
    },
  ]);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('chatMessage', (msg) => {
      if (msg.senderId === socket.id) return; // own message already shown
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), text: msg.text, sender: 'other' },
      ]);
    });

    return () => socket.disconnect();
  }, []);

  const sendMessage = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return false;

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), text: trimmed, sender: 'me' },
    ]);
    socketRef.current?.emit('chatMessage', trimmed);
    return true;
  };

  return { messages, sendMessage };
}
