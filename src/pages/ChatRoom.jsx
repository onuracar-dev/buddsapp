import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import useChatMessages from '../hooks/useChatMessages';
import { supabase } from '../supabase';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Send, Image as ImageIcon, Paperclip, Mic, FileText, Phone, Video as VideoIcon, Ghost, Zap, Flame, Volume2, Edit3, X, Bomb, RotateCcw, Keyboard, Gift, Skull, Gamepad2, Dices, StopCircle, Play, Pause, BarChart2, Plus, Minus } from 'lucide-react';
import { format } from 'date-fns';
import imageCompression from 'browser-image-compression';
import RecordRTC from 'recordrtc';
import XoxGame from '../components/chat/XoxGame';
import DoodleModal from '../components/chat/DoodleModal';
import { generateAiResponse } from '../services/aiService.js';
import { useMusic } from '../contexts/MusicContext';

const TROLL_SOUNDS = [
  { name: 'Osuruk 💨', url: 'https://www.soundjay.com/human/fart-01.mp3' },
  { name: 'Çığlık 😱', url: 'https://www.soundjay.com/human/woman-scream-01.mp3' },
  { name: 'Gülüş 😂', url: 'https://www.soundjay.com/human/man-laughing-01.mp3' }
];

const toZalgo = (text) => {
  const chars = ['\u030D', '\u030E', '\u0304', '\u0305', '\u033F', '\u0311', '\u0306', '\u0310', '\u0352', '\u0357', '\u0351', '\u0306', '\u0308', '\u030A', '\u0342', '\u0343', '\u0344', '\u034A', '\u034B', '\u034C', '\u0350', '\u0351', '\u0352', '\u0357', '\u0358', '\u035B', '\u035C', '\u035D', '\u035E', '\u035F', '\u0360', '\u0361', '\u034D', '\u034E', '\u034F', '\u035A', '\u0338', '\u0337', '\u0336', '\u0335', '\u0334', '\u0333', '\u0332', '\u0331', '\u0330', '\u032F', '\u032E', '\u032D', '\u032C', '\u032B', '\u032A', '\u0329', '\u0328', '\u0327', '\u0326', '\u0325', '\u0324', '\u0323', '\u0322', '\u0321', '\u0320', '\u031F', '\u031E', '\u031D', '\u031C', '\u031B', '\u031A', '\u0319', '\u0318', '\u0317', '\u0316'];
  return text.split('').map(c => {
    if (c === ' ') return c;
    let z = c;
    for(let i=0; i<3; i++) z += chars[Math.floor(Math.random()*chars.length)];
    return z;
  }).join('');
};

const EphemeralMessageContent = ({ msg, isMe }) => {
  const [destroyed, setDestroyed] = useState(msg.is_destroyed);
  
  useEffect(() => {
    if (msg.is_ephemeral && !msg.is_destroyed && !isMe) {
      const timer = setTimeout(async () => {
        setDestroyed(true);
        await supabase.from('messages').update({ is_destroyed: true }).eq('id', msg.id);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [msg, isMe]);

  if (destroyed || msg.is_destroyed) {
    return <span style={{ color: 'var(--danger)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '5px' }}><Flame size={16} /> [Bu mesaj kendini imha etti]</span>;
  }
  return <span style={{ fontSize: '0.95rem', wordBreak: 'break-word', lineHeight: '1.4' }}>{msg.content}</span>;
};

export default function ChatRoom() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { currentUser, userProfile, activeWorkspaceId } = useAuth();
  const isAdmin = userProfile?.isAdmin || false;
  const { messages, loading: messagesLoading } = useChatMessages(chatId);
  const [chatInfo, setChatInfo] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [participantProfiles, setParticipantProfiles] = useState({});
  
  // Troll states
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isEphemeral, setIsEphemeral] = useState(false);
  const [isZalgo, setIsZalgo] = useState(false);
  const [isCensor, setIsCensor] = useState(false);
  const [isSarcastic, setIsSarcastic] = useState(false);
  const [isFakeTyping, setIsFakeTyping] = useState(false);
  const [showTrollMenu, setShowTrollMenu] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showJumpscare, setShowJumpscare] = useState(false);
  const [isSleeping, setIsSleeping] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [doodleFile, setDoodleFile] = useState(null);

  // Anket (Poll) States
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  
  const { tuneIn, isPlaying, setIsPlaying, forcePlay, forcePause, radioTitle, currentTrack, togglePlay } = useMusic();

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => {
    const fetchChatInfo = async () => {
      try {
        const { data, error } = await supabase.from('chats').select('*').eq('id', chatId).single();
        if (!error && data) {
          if (data.workspace_id && data.workspace_id !== activeWorkspaceId && !isAdmin) {
            toast.error("Bu mekana ait değilsiniz!");
            navigate('/');
            return;
          }
          setChatInfo(data);
        } else {
          toast.error("Sohbet bulunamadı");
          navigate('/');
        }
      } catch (error) { toast.error("Hata oluştu"); }
    };
    fetchChatInfo();

    const channel = supabase.channel(`public:chats:${chatId}`, { config: { broadcast: { self: true } } })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chats', filter: `id=eq.${chatId}` }, (payload) => {
        setChatInfo(payload.new);
      })
      .on('broadcast', { event: 'troll_sound' }, (payload) => {
        if (payload.payload.senderId === currentUser.id) return;
        toast('Bir troll ses bombası patladı! 🔊', { icon: '💣' });
        const audio = new Audio(payload.payload.url);
        audio.play().catch(e => console.error("Audio play error:", e));
      })
      .on('broadcast', { event: 'music_sync' }, (payload) => {
        if (payload.payload.senderId === currentUser.id) return;
        if (payload.payload.action === 'pause') {
          forcePause();
          setIsPlaying(false);
          toast.success('Müzik başkası tarafından durduruldu', { icon: '⏸️' });
        } else if (payload.payload.action === 'play') {
          forcePlay();
          setIsPlaying(true);
          toast.success('Müzik başkası tarafından başlatıldı', { icon: '▶️' });
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => supabase.removeChannel(channel);
  }, [chatId, navigate]);

  useEffect(() => {
    if (chatInfo && chatInfo.participants && chatInfo.participants.length > 0) {
      const uids = chatInfo.participants;
      supabase.from('users').select('id, display_name, photo_url').in('id', uids)
        .then(({data}) => {
          if (data) {
            const map = {};
            data.forEach(u => map[u.id] = u);
            setParticipantProfiles(map);
          }
        });
    }
  }, [chatInfo?.participants]);

  // Titretme, Ters Döndürme ve Uyutma efekti kontrolü
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && new Date() - new Date(lastMsg.created_at) < 5000) {
        if (lastMsg.type === 'shake') {
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 3000);
        } else if (lastMsg.type === 'flip') {
          setIsFlipped(true);
          setTimeout(() => setIsFlipped(false), 10000);
        } else if (lastMsg.type === 'sleep' && lastMsg.sender_uid !== currentUser.id) {
          setIsSleeping(true);
        }
      }
    }
  }, [messages, currentUser.id]);

  // Fake Typing Kontrolü
  useEffect(() => {
    let interval;
    if (isFakeTyping) {
      interval = setInterval(async () => {
        await supabase.from('chats').update({ typing: { ...(chatInfo?.typing || {}), [currentUser.id]: true } }).eq('id', chatId);
      }, 2000);
    } else {
      supabase.from('chats').update({ typing: { ...(chatInfo?.typing || {}), [currentUser.id]: false } }).eq('id', chatId);
    }
    return () => clearInterval(interval);
  }, [isFakeTyping, chatId, currentUser.id, chatInfo?.typing]);

  // Ban Süresi Kontrolü
  useEffect(() => {
    const checkBan = () => {
      const banTime = chatInfo?.banned_until?.[currentUser.id];
      if (banTime && banTime > Date.now()) {
        setTimeLeft(Math.ceil((banTime - Date.now()) / 1000));
      } else {
        setTimeLeft(0);
      }
    };
    const inv = setInterval(checkBan, 1000);
    checkBan();
    return () => clearInterval(inv);
  }, [chatInfo, currentUser.id]);

  const handleTyping = async (e) => {
    setText(e.target.value);
    if (!isFakeTyping) {
      if (!isTyping && e.target.value.trim() !== '') {
        setIsTyping(true);
        await supabase.from('chats').update({ typing: { ...(chatInfo?.typing || {}), [currentUser.id]: true } }).eq('id', chatId);
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(async () => {
        setIsTyping(false);
        await supabase.from('chats').update({ typing: { ...(chatInfo?.typing || {}), [currentUser.id]: false } }).eq('id', chatId);
      }, 2000);
    }
  };

  const handleInputFocus = () => {
    setTimeout(() => {
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const otherUserId = chatInfo?.participants?.find(p => p !== currentUser.id);
  const otherUser = otherUserId ? participantProfiles[otherUserId] : null;

  const isSpyMode = isAdmin && chatInfo?.participants?.length > 0 && !chatInfo.participants.includes(currentUser.id);
  const spyName = isSpyMode && chatInfo?.participants?.length >= 2 
    ? `${participantProfiles[chatInfo.participants[0]]?.display_name || 'Bilinmiyor'} || ${participantProfiles[chatInfo.participants[1]]?.display_name || 'Bilinmiyor'} Sohbeti`
    : null;

  useEffect(() => {
    if (chatInfo?.youtube_id) {
      let rName = chatInfo?.name;
      if (rName?.includes('||')) rName = rName.split('||')[0].trim();
      const roomName = chatInfo?.type?.includes('group') 
        ? rName 
        : (otherUser?.display_name || 'Özel Sohbet');
      tuneIn(chatId, chatInfo.youtube_id, chatInfo.created_at, roomName);
    }
  }, [chatInfo?.youtube_id, chatId, tuneIn, chatInfo?.created_at, chatInfo?.name, chatInfo?.type, otherUser?.display_name]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    const markAsRead = async () => {
      const unreadMessages = messages.filter(msg => !msg.read_by?.includes(currentUser.id));
      if (unreadMessages.length > 0) {
        for (const msg of unreadMessages) {
          try {
            await supabase.from('messages').update({ read_by: [...(msg.read_by || []), currentUser.id] }).eq('id', msg.id);
          } catch (e) { }
        }
      }
    };
    if (messages.length > 0) markAsRead();
  }, [messages, chatId, currentUser.id]);

  const checkAndAwardBadges = async () => {
    try {
      const { data: userData } = await supabase.from('users').select('message_count, badges').eq('id', currentUser.id).single();
      if (userData) {
        const newCount = (userData.message_count || 0) + 1;
        
        const currentBadges = userData.badges || [];
        const newBadges = [...currentBadges];
        let added = false;
        
        if (newCount >= 10 && !newBadges.includes('🐣 Çırak')) { newBadges.push('🐣 Çırak'); added = true; }
        if (newCount >= 100 && !newBadges.includes('🗣️ Sohbet Makinesi')) { newBadges.push('🗣️ Sohbet Makinesi'); added = true; }
        if (newCount >= 500 && !newBadges.includes('🔥 Efsane')) { newBadges.push('🔥 Efsane'); added = true; }
        
        const hour = new Date().getHours();
        if (hour >= 0 && hour < 6 && !newBadges.includes('🦉 Gece Kuşu')) { newBadges.push('🦉 Gece Kuşu'); added = true; }

        await supabase.from('users').update({ 
          message_count: newCount, 
          ...(added ? { badges: newBadges } : {}) 
        }).eq('id', currentUser.id);

        if (added) {
          toast.success(`🏆 Yeni Rozet Kazandın: ${newBadges[newBadges.length - 1]}`, { duration: 4000, position: 'top-center' });
        }
      }
    } catch (e) {
      console.error("Rozet kontrol hatası:", e);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setSending(true);
    try {
      let finalContent = text.trim();
      if (isZalgo && isAdmin) finalContent = toZalgo(finalContent);
      if (isCensor) finalContent = finalContent.replace(/[aeıioöuüAEIİOÖUÜ]/g, '*');
      if (isSarcastic) finalContent = finalContent.split('').map(c => Math.random() > 0.5 ? c.toUpperCase() : c.toLowerCase()).join('');

      const msgData = {
        chat_id: chatId, sender_uid: currentUser.id, type: 'text', content: finalContent,
        read_by: [currentUser.id], reply_to: replyingTo ? replyingTo.id : null,
        is_anonymous: isAnonymous, is_ephemeral: isEphemeral
      };

      const { error: msgError } = await supabase.from('messages').insert([msgData]);
      if (msgError) throw msgError;

      let notifText = text.trim();
      if (isAnonymous) notifText = 'Gizemli Biri yazdı...';
      else if (isZalgo && isAdmin) notifText = 'L̵a̶n̶e̵t̷';
      else if (isCensor) notifText = notifText.replace(/[aeıioöuüAEIİOÖUÜ]/g, '*');

      await supabase.from('chats').update({
        last_message: { text: notifText, senderUid: currentUser.id, timestamp: new Date().toISOString() },
        updated_at: new Date().toISOString(),
        ...getStreakUpdates()
      }).eq('id', chatId);

      // Mesaj sayısını artır ve rozet kontrolü yap (Asenkron arka planda çalışsın)
      checkAndAwardBadges();

      // AI TETİKLEYİCİSİ
      const isAiTriggered = finalContent.match(/^[@!](AI|bot)\s*/i) || finalContent.trim().toUpperCase() === '@AI';
      if (isAiTriggered) {
        setText(''); setReplyingTo(null); setSending(false);
        
        setTimeout(async () => {
          try {
            // AI Yazıyor... (Fresh state)
            const { data: currentChat } = await supabase.from('chats').select('typing').eq('id', chatId).single();
            await supabase.from('chats').update({ typing: { ...(currentChat?.typing || {}), ['ai_bot']: true } }).eq('id', chatId);
            
            const prompt = finalContent.replace(/^[@!](AI|bot)\s*/i, '');
            const aiReply = await generateAiResponse(messages, prompt);
            
            await supabase.from('messages').insert([{
              chat_id: chatId, sender_uid: currentUser.id,
              type: 'ai_bot', content: aiReply,
              is_anonymous: true,
              read_by: []
            }]);

            const { data: latestChat } = await supabase.from('chats').select('typing').eq('id', chatId).single();
            await supabase.from('chats').update({
              last_message: { text: 'Budds AI cevap verdi...', senderUid: currentUser.id, timestamp: new Date().toISOString() },
              updated_at: new Date().toISOString(),
              typing: { ...(latestChat?.typing || {}), ['ai_bot']: false }
            }).eq('id', chatId);
          } catch (err) {
            console.error("AI Error:", err);
            const { data: latestChat } = await supabase.from('chats').select('typing').eq('id', chatId).single();
            await supabase.from('chats').update({
              typing: { ...(latestChat?.typing || {}), ['ai_bot']: false }
            }).eq('id', chatId);
          }
        }, 100);
      } else {
        setText(''); setReplyingTo(null);
      }
    } catch (error) { toast.error('Mesaj gönderilemedi'); } finally { setSending(false); }
  };

  const sendSpecialMessage = async (type, content = '') => {
    try {
      if (type === 'troll_audio') {
        const audio = new Audio(content);
        audio.play().catch(e => console.error("Audio play error:", e));
        
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'troll_sound',
            payload: { url: content, senderId: currentUser.id }
          });
        }
        setShowTrollMenu(false);
        return;
      }

      await supabase.from('messages').insert([{
        chat_id: chatId, sender_uid: currentUser.id, type, content, read_by: [currentUser.id]
      }]);
      setShowTrollMenu(false);
    } catch (e) { toast.error("Gönderilemedi"); }
  };

  const setNickname = async (targetUserId) => {
    const newName = prompt('Bu kişiye zorla hangi lakabı takmak istiyorsun?');
    if (!newName) return;
    
    const newNicknames = { ...(chatInfo?.nicknames || {}), [targetUserId]: newName };
    await supabase.from('chats').update({ nicknames: newNicknames }).eq('id', chatId);
    setSelectedMessage(null);
    toast.success("Lakap takıldı! 🤡");
  };

  const deleteMessage = async (msgId) => {
    if (!window.confirm('Bu mesajı kalıcı olarak yok etmek istediğine emin misin, Diktatör?')) return;
    try {
      const msg = messages.find(m => m.id === msgId);
      if (msg && ['image', 'video', 'audio', 'file'].includes(msg.type) && msg.content) {
        const filePath = msg.content.split('/public/chats/')[1];
        if (filePath) {
          await supabase.storage.from('chats').remove([filePath]);
        }
      }
      await supabase.from('messages').delete().eq('id', msgId);
      
      const remainingMessages = messages.filter(m => m.id !== msgId);
      if (remainingMessages.length > 0) {
        const newLast = remainingMessages[remainingMessages.length - 1];
        let previewText = newLast.type === 'text' || newLast.type === 'ai_bot' ? newLast.content : 
                          (newLast.type === 'image' ? '📷 Fotoğraf' : 
                          newLast.type === 'video' ? '🎥 Video' : 
                          newLast.type === 'audio' ? '🎤 Ses' : 
                          newLast.type === 'file' ? '📄 Dosya' : 'Oyun / Ekstra');
        
        await supabase.from('chats').update({
          last_message: { text: previewText, senderUid: newLast.sender_uid, timestamp: newLast.created_at }
        }).eq('id', chatId);
      } else {
        await supabase.from('chats').update({ last_message: null }).eq('id', chatId);
      }

      toast.success('Mesaj tarihten silindi.');
      setSelectedMessage(null);
    } catch (e) {
      toast.error('Mesaj silinemedi.');
    }
  };

  const deleteChat = async () => {
    if (!window.confirm('BU SOHBETİ KOMPLE YOK ETMEK İSTEDİĞİNE EMİN MİSİN? Tüm mesajlar ve medya kalıcı olarak silinecek.')) return;
    try {
      const mediaMessages = messages.filter(m => ['image', 'video', 'audio', 'file'].includes(m.type) && m.content);
      const filePaths = mediaMessages.map(m => {
        const parts = m.content.split('/public/chats/');
        return parts.length > 1 ? parts[1] : null;
      }).filter(Boolean);
      
      if (filePaths.length > 0) {
        await supabase.storage.from('chats').remove(filePaths);
      }
      
      await supabase.from('chats').delete().eq('id', chatId);
      toast.success('Sohbet tamamen yeryüzünden silindi.');
      navigate('/');
    } catch (e) {
      toast.error('Sohbet silinemedi.');
    }
  };

  const playRoulette = async () => {
    const isDead = Math.random() < 0.20;
    if (isDead) {
      toast.error("💥 PATLADI! 1 Dakika Uzaklaştırıldın!");
      await supabase.from('chats').update({
        banned_until: { ...(chatInfo?.banned_until || {}), [currentUser.id]: Date.now() + 60000 }
      }).eq('id', chatId);
    } else {
      toast.success("Tık! Boş... Kurtuldun. 😌");
    }
  };

  const triggerJumpscare = () => {
    setShowJumpscare(true);
    setTimeout(() => setShowJumpscare(false), 3000);
  };

  const getStreakUpdates = () => {
    if (!chatInfo) return {};
    const todayStr = new Date().toDateString();
    const lastStreakStr = chatInfo.streak_last_date ? new Date(chatInfo.streak_last_date).toDateString() : null;
    
    let newStreakCount = chatInfo.streak_count || 0;
    let newStreakDate = chatInfo.streak_last_date;

    if (lastStreakStr !== todayStr) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastStreakStr === yesterday.toDateString()) {
        newStreakCount += 1;
      } else {
        newStreakCount = 1;
      }
      newStreakDate = new Date().toISOString();
    }
    return { streak_count: newStreakCount, streak_last_date: newStreakDate };
  };

  const playBottleGame = async () => {
    const participants = chatInfo.participants;
    const targetUserId = participants[Math.floor(Math.random() * participants.length)];
    
    await supabase.from('messages').insert([{
      chat_id: chatId, sender_uid: currentUser.id, type: 'game_bottle', 
      content: targetUserId, read_by: [currentUser.id]
    }]);
    checkAndAwardBadges();
    setShowTrollMenu(false);
  };

  const startXoxGame = async () => {
    const initialState = {
      board: Array(9).fill(null), playerX: null, playerO: null, turn: 'X', winner: null
    };
    await supabase.from('messages').insert([{
      chat_id: chatId, sender_uid: currentUser.id, type: 'game_xox', 
      content: JSON.stringify(initialState), read_by: [currentUser.id]
    }]);
    checkAndAwardBadges();
    setShowTrollMenu(false);
  };

  const createPoll = async () => {
    if (!pollQuestion.trim() || pollOptions.some(opt => !opt.trim())) {
      return toast.error('Lütfen soruyu ve tüm şıkları doldurun!');
    }
    
    const pollData = {
      question: pollQuestion,
      options: pollOptions.map((opt, idx) => ({ id: idx.toString(), text: opt, votes: [] }))
    };

    await supabase.from('messages').insert([{
      chat_id: chatId, sender_uid: currentUser.id, type: 'poll',
      content: JSON.stringify(pollData), read_by: [currentUser.id]
    }]);

    checkAndAwardBadges();
    setShowPollModal(false);
    setPollQuestion('');
    setPollOptions(['', '']);
  };

  const handleVote = async (msgId, currentContentStr, optionId) => {
    try {
      const pollData = JSON.parse(currentContentStr);
      // Remove user's previous votes
      pollData.options.forEach(opt => {
        opt.votes = opt.votes.filter(uid => uid !== currentUser.id);
      });
      // Add vote to new option
      const targetOpt = pollData.options.find(opt => opt.id === optionId);
      if (targetOpt) {
        targetOpt.votes.push(currentUser.id);
      }
      await supabase.from('messages').update({ content: JSON.stringify(pollData) }).eq('id', msgId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = async (e, type, directFile = null) => {
    const file = directFile || (e && e.target.files[0]);
    if (!file) return;
    
    if (type === 'video') {
      const duration = await new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = function() {
          URL.revokeObjectURL(video.src);
          resolve(video.duration);
        };
        video.src = URL.createObjectURL(file);
      });
      
      if (duration > 11) { // 10 sn limiti (1 sn pay)
        toast.error('Video süresi maksimum 10 saniye olabilir!');
        if (e?.target) e.target.value = '';
        return;
      }
    }

    setSending(true); setUploadProgress(50);
    try {
      let finalFile = file;
      if (type === 'image') {
        const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1920, useWebWorker: true };
        finalFile = await imageCompression(file, options);
      }

      const fileExtension = finalFile.name.split('.').pop() || 'jpeg';
      const fileName = `${Date.now()}.${fileExtension}`;
      const filePath = `${chatId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('chats').upload(filePath, finalFile);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('chats').getPublicUrl(filePath);
      await supabase.from('messages').insert([{
        chat_id: chatId, sender_uid: currentUser.id, type: type, content: data.publicUrl, file_name: finalFile.name, read_by: [currentUser.id],
        is_anonymous: isAnonymous, is_ephemeral: isEphemeral
      }]);
      await supabase.from('chats').update({
        last_message: { text: type === 'image' ? '📷 Fotoğraf' : type === 'video' ? '🎥 Video' : '📄 Dosya', senderUid: currentUser.id, timestamp: new Date().toISOString() },
        updated_at: new Date().toISOString(),
        ...getStreakUpdates()
      }).eq('id', chatId);
    } catch (error) { toast.error('Dosya yüklenemedi'); } finally { setSending(false); setUploadProgress(0); }
  };

  const handleBgUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const toastId = toast.loading('Arka plan yükleniyor...');
    try {
      const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1920, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);

      const fileExt = compressedFile.name.split('.').pop() || 'jpeg';
      const filePath = `bg_${chatId}_${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('chats').upload(filePath, compressedFile);
      if (error) throw error;
      const { data } = supabase.storage.from('chats').getPublicUrl(filePath);
      await supabase.from('chats').update({ bg_url: data.publicUrl }).eq('id', chatId);
      toast.success('Arka plan güncellendi!', { id: toastId });
    } catch(e) { 
      toast.error('Arka plan yüklenemedi', { id: toastId }); 
    }
  };

  const handleGroupAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const toastId = toast.loading('Grup fotoğrafı yükleniyor...');
    try {
      const options = { maxSizeMB: 0.5, maxWidthOrHeight: 800, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      const fileExt = compressedFile.name.split('.').pop() || 'jpeg';
      const filePath = `avatar_${chatId}_${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('chats').upload(filePath, compressedFile);
      if (error) throw error;
      const { data } = supabase.storage.from('chats').getPublicUrl(filePath);
      await supabase.from('chats').update({ photo_url: data.publicUrl }).eq('id', chatId);
      toast.success('Grup fotoğrafı güncellendi!', { id: toastId });
    } catch(err) { 
      toast.error('Fotoğraf yüklenemedi', { id: toastId }); 
    }
  };

  const handleEditRoomName = async () => {
    const currentNamePart = chatInfo?.name?.includes('||') ? chatInfo.name.split('||')[0].trim() : chatInfo?.name;
    const currentDescPart = chatInfo?.name?.includes('||') ? chatInfo.name.split('||')[1].trim() : '';

    const newName = window.prompt('Oda Adı:', currentNamePart);
    if (newName === null) return;
    
    const newDesc = window.prompt('Oda Açıklaması (Opsiyonel):', currentDescPart);
    if (newDesc === null) return;

    const finalName = newDesc.trim() ? `${newName.trim()} || ${newDesc.trim()}` : newName.trim();
    if (finalName === chatInfo.name) return;

    const toastId = toast.loading('Güncelleniyor...');
    try {
      await supabase.from('chats').update({ name: finalName }).eq('id', chatId);
      toast.success('Güncellendi!', { id: toastId });
    } catch(e) {
      toast.error('Hata oluştu.', { id: toastId });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/webm',
        disableLogs: true
      });
      recorder.startRecording();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch (e) {
      console.error(e);
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        toast.error('Mikrofon izni engellenmiş! Lütfen telefonunuzun Ayarlar (Settings) bölümünden uygulamaya mikrofon izni verin.', { duration: 6000 });
      } else {
        toast.error('Mikrofona erişilemedi');
      }
    }
  };

  const stopRecording = () => {
    if (!isRecording || !recorderRef.current) return;
    
    recorderRef.current.stopRecording(async () => {
      setIsRecording(false);
      setSending(true);
      
      try {
        const audioBlob = recorderRef.current.getBlob();
        const fileExt = audioBlob.type.includes('mp4') ? 'mp4' : (audioBlob.type.includes('ogg') ? 'ogg' : 'webm');
        const filePath = `${chatId}/voice_${Date.now()}.${fileExt}`;
        
        await supabase.storage.from('chats').upload(filePath, audioBlob);
        const { data } = supabase.storage.from('chats').getPublicUrl(filePath);
        
        await supabase.from('messages').insert([{
          chat_id: chatId, sender_uid: currentUser.id, type: 'audio', content: data.publicUrl, read_by: [currentUser.id]
        }]);
        
        await supabase.from('chats').update({
          last_message: { text: '🎤 Ses Mesajı', senderUid: currentUser.id, timestamp: new Date().toISOString() },
          updated_at: new Date().toISOString(),
          ...getStreakUpdates()
        }).eq('id', chatId);
      } catch (error) {
        toast.error('Ses gönderilemedi');
      } finally {
        setSending(false);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        if (recorderRef.current) {
          recorderRef.current.destroy();
          recorderRef.current = null;
        }
      }
    });
  };

  const handleMicClick = (e) => {
    e.preventDefault();
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const formatMessageTime = (timestamp) => timestamp ? format(new Date(timestamp), 'HH:mm') : '';

  const handleReaction = async (msgId, emoji) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const newReactions = { ...(msg.reactions || {}) };
    if (newReactions[currentUser.id] === emoji) delete newReactions[currentUser.id];
    else newReactions[currentUser.id] = emoji;
    setSelectedMessage(null);
    await supabase.from('messages').update({ reactions: newReactions }).eq('id', msgId);
  };

  const startCall = async (type) => {
    const roomName = `room_${chatId}_${Date.now()}`;
    await supabase.from('calls').insert([{ chat_id: chatId, caller_id: currentUser.id, room_name: roomName, type: type, status: 'ringing' }]);
    navigate(`/call/${roomName}`);
  };

  const getSenderName = (msg) => {
    if (msg.type === 'ai_bot') return 'Budds AI 🤖';
    if (msg.is_anonymous && msg.sender_uid !== currentUser.id) return 'Gizemli Biri 🕵🏻‍♂️';
    if (msg.sender_uid === currentUser.id && !msg.is_anonymous) return 'Sen';
    if (msg.is_anonymous && msg.sender_uid === currentUser.id) return 'Sen (Gizli)';
    if (chatInfo?.nicknames && chatInfo.nicknames[msg.sender_uid]) return chatInfo.nicknames[msg.sender_uid] + ' 🤡';
    return participantProfiles[msg.sender_uid]?.display_name || 'Karşı Taraf';
  };

  const typingUsers = Object.keys(chatInfo?.typing || {}).filter(uid => chatInfo.typing[uid]);

  return (
    <>
      {doodleFile && (
        <DoodleModal 
          file={doodleFile} 
          onCancel={() => setDoodleFile(null)} 
          onSend={(modifiedFile) => {
            setDoodleFile(null);
            handleFileUpload(null, 'image', modifiedFile);
          }}
        />
      )}
      {showJumpscare && (
        <div className="jumpscare-overlay">
          <img src="https://media.tenor.com/7bVMQ5-v3B0AAAAC/jumpscare-scary.gif" alt="Scary" />
          <audio autoPlay src="https://www.soundjay.com/human/woman-scream-01.mp3" />
        </div>
      )}

      {isSleeping && (
        <div style={{ position: 'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,0.95)', zIndex:99999, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column' }} onClick={() => setIsSleeping(false)}>
          <span style={{ fontSize: '3rem', animation: 'bounce 2s infinite' }}>💤</span>
          <span style={{ color: '#aaa', marginTop:'20px' }}>Uyanmak için dokun</span>
          <audio autoPlay loop src="https://www.soundjay.com/human/snoring-1.mp3" />
        </div>
      )}

      <div className={`flex-col ${isShaking ? 'shake-screen' : ''} ${isFlipped ? 'flip-screen' : ''} chat-bg`} style={{ flex: 1, minHeight: 0, backgroundImage: chatInfo?.bg_url ? `url(${chatInfo.bg_url})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', overflow: 'hidden' }}>
        
        {/* Header */}
        <div className="flex-between glass" style={{ padding: '10px 15px', borderBottom: '1px solid var(--border)', zIndex: 10 }}>
          <button onClick={() => navigate('/')} style={{ padding: '8px' }}><ArrowLeft size={24} color="var(--text-primary)" /></button>
          <label style={{ display: 'flex', cursor: chatInfo?.type.includes('group') && isAdmin ? 'pointer' : 'default' }}>
            <img 
              src={chatInfo?.type.includes('group') ? (chatInfo.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(chatInfo?.name || 'S')}&background=random&color=fff&size=100&bold=true`) : (otherUser?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.display_name || 'S')}&background=random&color=fff&size=100&bold=true`)}
              onClick={(e) => {
                if (!chatInfo?.type.includes('group') && otherUserId) {
                  navigate(`/user/${otherUserId}`);
                }
              }}
              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', cursor: !chatInfo?.type.includes('group') ? 'pointer' : (isAdmin ? 'pointer' : 'default') }}
              alt="Avatar"
            />
            {chatInfo?.type.includes('group') && isAdmin && (
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleGroupAvatarUpload} />
            )}
          </label>
          <div className="flex-col" style={{ flex: 1 }}>
            <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {chatInfo?.type.includes('group') ? (chatInfo?.name?.includes('||') ? chatInfo.name.split('||')[0].trim() : chatInfo?.name) : (spyName || otherUser?.display_name || 'Sohbet')}
              {isAdmin && chatInfo?.type.includes('group') && (
                <button 
                  onClick={handleEditRoomName}
                  style={{ background: 'transparent', padding: '4px', display: 'flex', color: 'var(--text-tertiary)', cursor: 'pointer' }}
                  title="Oda ismini/açıklamasını düzenle"
                >
                  <Edit3 size={16} />
                </button>
              )}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {typingUsers.length > 0 ? <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>Yazıyor...</span> : (chatInfo?.type.includes('group') ? `${chatInfo?.participants?.length || 0} kişi` : 'Çevrimiçi')}
            </span>
          </div>
          
          <div className="flex-center" style={{ gap: '15px', marginLeft: 'auto' }}>
            {currentTrack?.roomId === chatId && (
              <button 
                onClick={togglePlay}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '5px' }}
                title="Müziği Durdur/Başlat"
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
            )}
            
            {isAdmin && chatInfo?.youtube_id && (
              <button 
                onClick={async () => {
                  const newVal = !chatInfo.allow_speaking;
                  await supabase.from('chats').update({ allow_speaking: newVal }).eq('id', chatId);
                  toast.success(newVal ? 'Kullanıcılara konuşma izni verildi!' : 'Konuşma izni kapatıldı.');
                }} 
                title="Sesi Aç/Kapat (Admin)" 
                style={{ background: chatInfo.allow_speaking ? 'var(--success)' : 'var(--warning)', color: '#fff', padding: '5px 10px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}
              >
                {chatInfo.allow_speaking ? 'Sesi Kapat' : 'Sesi Aç'}
              </button>
            )}
            {isAdmin && (
              <button onClick={deleteChat} title="Sohbeti Komple Sil (Sadece Admin)" style={{ background: 'var(--danger)', color: '#fff', padding: '5px 10px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>SİL</button>
            )}
            {(!chatInfo?.youtube_id || chatInfo?.allow_speaking || isAdmin) && (
              <>
                <button onClick={() => startCall('audio')} style={{ background: 'transparent', padding: '5px' }}><Phone size={22} color="var(--primary)" /></button>
                <button onClick={() => startCall('video')} style={{ background: 'transparent', padding: '5px' }}><VideoIcon size={24} color="var(--primary)" /></button>
              </>
            )}
          </div>
        </div>

        {/* Müzik / Radyo Player UI Only */}
        {chatInfo?.youtube_id && (() => {
          const isPlaylist = chatInfo.youtube_id.length > 15;
          const isThisRoomPlaying = currentTrack?.roomId === chatId;
          
          return (
            <div style={{ padding: '15px', background: 'linear-gradient(45deg, #0f172a, #000)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '15px' }}>
              
              <div style={{ position: 'relative', width: '50px', height: '50px', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 0 15px rgba(59, 130, 246, 0.4)', flexShrink: 0 }}>
                {/* Sadece Görsel Kapak (Oynatıcı Globalde) */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2, pointerEvents: 'none' }}>
                  {isPlaylist ? (
                    <div className="flex-center" style={{ width: '100%', height: '100%', background: 'var(--primary)', color: '#fff' }}>
                      <span style={{ fontSize: '1.5rem', animation: isThisRoomPlaying && isPlaying ? 'pulse 2s infinite' : 'none' }}>📻</span>
                    </div>
                  ) : (
                    <img 
                      src={`https://img.youtube.com/vi/${chatInfo.youtube_id}/mqdefault.jpg`} 
                      alt="Kapak" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                </div>
              </div>
              
              <div className="flex-col" style={{ flex: 1, minWidth: 0 }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <span style={{ display: 'inline-block', flexShrink: 0, width: '8px', height: '8px', background: isThisRoomPlaying && isPlaying ? 'var(--success)' : 'var(--danger)', borderRadius: '50%', boxShadow: `0 0 8px ${isThisRoomPlaying && isPlaying ? 'var(--success)' : 'var(--danger)'}`, animation: isThisRoomPlaying && isPlaying ? 'pulse 2s infinite' : 'none' }}></span>
                  {isThisRoomPlaying ? radioTitle : 'Bağlanılıyor...'}
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isThisRoomPlaying && isPlaying ? 'Arka planda çalıyor...' : 'Bağlantı bekleniyor'}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {messagesLoading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>Mesajlar yükleniyor...</div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', margin: 'auto' }}>İlk mesajı sen gönder!</div>
          ) : (
            messages.filter(msg => msg && msg.type !== 'shake' && msg.type !== 'flip').map(msg => {
              const spyMeId = isSpyMode ? chatInfo.participants[0] : currentUser.id;
              const isMe = msg.sender_uid === spyMeId && msg.type !== 'ai_bot';
              const repliedMsg = msg.reply_to ? messages.find(m => m.id === msg.reply_to) : null;
              const showMenu = selectedMessage === msg.id;
              const senderName = getSenderName(msg);

              return (
                <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  
                  {showMenu && (
                    <div className="glass shadow-lg flex-center" style={{ position: 'absolute', top: '-45px', [isMe ? 'right' : 'left']: '0', padding: '8px', borderRadius: 'var(--radius-full)', gap: '10px', zIndex: 20 }}>
                      {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(em => (
                        <span key={em} onClick={() => handleReaction(msg.id, em)} style={{ cursor: 'pointer', fontSize: '1.2rem', transition: 'transform 0.1s' }} onMouseOver={e=>e.target.style.transform='scale(1.2)'} onMouseOut={e=>e.target.style.transform='scale(1)'}>{em}</span>
                      ))}
                      <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
                      <button onClick={() => { setReplyingTo(msg); setSelectedMessage(null); }} style={{ background: 'transparent', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '500', padding: '0 5px' }}>Yanıtla</button>
                      {!isMe && chatInfo?.type === 'group' && (
                        <button onClick={() => setNickname(msg.sender_uid)} style={{ background: 'transparent', color: 'var(--danger)', fontSize: '0.85rem', fontWeight: '500', padding: '0 5px', display: 'flex', alignItems: 'center', gap: '3px' }}><Edit3 size={14}/> Lakap</button>
                      )}
                      {isAdmin && (
                        <button onClick={() => deleteMessage(msg.id)} style={{ background: 'transparent', color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 'bold', padding: '0 5px' }}>Yok Et 💣</button>
                      )}
                      <button onClick={() => setSelectedMessage(null)} style={{ background: 'transparent', color: 'var(--text-tertiary)', marginLeft: '5px' }}>✕</button>
                    </div>
                  )}

                  {(!isMe && chatInfo?.type?.includes('group')) || isSpyMode ? (
                    <div className="flex-center" style={{ gap: '5px', marginBottom: '2px', alignSelf: isMe ? 'flex-end' : 'flex-start', cursor: 'pointer', flexDirection: isMe ? 'row-reverse' : 'row' }} onClick={() => navigate(`/user/${msg.sender_uid}`)}>
                      <img 
                        src={participantProfiles[msg.sender_uid]?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random&color=fff&size=50`}
                        style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }}
                        alt="Avatar"
                      />
                      <span style={{ fontSize: '0.75rem', color: msg.is_anonymous ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: 'bold' }}>
                        {senderName}
                      </span>
                    </div>
                  ) : null}

                  <div 
                    onClick={() => setSelectedMessage(msg.id)}
                    className={`msg-bubble ${isMe ? 'msg-out' : 'msg-in'}`}
                    style={{
                    background: msg.is_anonymous ? '#fff0f0' : undefined,
                    color: msg.is_anonymous ? 'var(--danger)' : undefined,
                    boxShadow: msg.is_anonymous ? '0 0 10px rgba(239,68,68,0.3)' : undefined,
                    border: msg.is_anonymous ? '1px solid var(--danger)' : undefined,
                    cursor: 'pointer'
                  }}>
                    {repliedMsg && (
                      <div style={{ background: 'rgba(0,0,0,0.1)', padding: '5px 8px', borderRadius: '4px', marginBottom: '8px', fontSize: '0.85rem', borderLeft: '3px solid var(--accent)' }}>
                        <span style={{ fontWeight: '600', display: 'block', fontSize: '0.75rem', marginBottom: '2px', color: 'var(--accent)' }}>{repliedMsg.sender_uid === currentUser.id ? 'Sen' : 'Karşı Taraf'}</span>
                        {repliedMsg.type === 'text' ? repliedMsg.content.substring(0, 50) : `[${repliedMsg.type.toUpperCase()}]`}
                      </div>
                    )}

                    {(msg.type === 'text' || msg.type === 'ai_bot') && (
                      msg.is_ephemeral ? <EphemeralMessageContent msg={msg} isMe={isMe} /> :
                      <span style={{ fontSize: '0.95rem', wordBreak: 'break-word', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                    )}
                    {msg.type === 'jumpscare' && (
                      <button onClick={triggerJumpscare} className="flex-center" style={{ gap: '10px', background: 'var(--warning)', color: '#fff', padding: '10px 15px', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', width: '100%' }}>
                        <Gift size={24} /> Sana bir hediye! (Tıkla)
                      </button>
                    )}
                    {msg.type === 'roulette' && (
                      <button onClick={playRoulette} className="flex-center" style={{ gap: '10px', background: '#333', color: '#fff', padding: '10px 15px', borderRadius: '8px', fontSize: '0.9rem', width: '100%' }}>
                        <Skull size={20} color="var(--danger)" /> Rus Ruleti (Oyna)
                      </button>
                    )}
                    {msg.type === 'game_xox' && <XoxGame msg={msg} />}
                    {msg.type === 'game_bottle' && (
                      <div className="flex-center flex-col" style={{ background: 'var(--warning)', color: '#fff', padding: '15px', borderRadius: '8px', gap: '5px', width: '100%' }}>
                        <span style={{ fontSize: '2.5rem', animation: 'spin 1s ease-in-out' }}>🍾</span>
                        <span style={{ fontWeight: 'bold' }}>Şişe Çevrildi!</span>
                        <span style={{ fontSize: '0.9rem', textAlign: 'center' }}>Hedef: <b>{getSenderName({ sender_uid: msg.content, is_anonymous: false })}</b></span>
                        <span style={{ fontSize: '1.1rem', marginTop: '5px', fontWeight: '800' }}>Doğruluk mu, Cesaret mi?</span>
                      </div>
                    )}
                    {msg.type === 'image' && <img src={msg.content} alt="Medya" style={{ width: '100%', maxWidth: '250px', borderRadius: '8px' }} />}
                    {msg.type === 'video' && <video src={msg.content} controls style={{ width: '100%', maxWidth: '250px', borderRadius: '8px' }} />}
                    {msg.type === 'file' && (() => {
                      const isDocument = msg.file_name && /\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(msg.file_name);
                      // Sadece Office dosyalarını Google Docs ile açıyoruz, PDF'ler tarayıcıda nativ açılır.
                      const fileUrl = isDocument 
                        ? `https://docs.google.com/viewer?url=${encodeURIComponent(msg.content)}` 
                        : msg.content;
                        
                      return (
                        <a href={fileUrl} target="_blank" rel="noreferrer" className="flex-center" style={{ gap: '12px', color: 'inherit', textDecoration: 'none', background: 'rgba(0,0,0,0.15)', padding: '10px 15px', borderRadius: '10px' }}>
                          <FileText size={28} />
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <span style={{ fontWeight: '600', fontSize: '0.85rem', wordBreak: 'break-all', lineHeight: '1.2' }}>{msg.file_name || 'Dosya'}</span>
                            <span style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '3px' }}>Açmak için tıkla</span>
                          </div>
                        </a>
                      );
                    })()}
                    {msg.type === 'audio' && (
                      <audio 
                        src={msg.content} 
                        controls 
                        style={{ width: '250px', height: '40px' }} 
                      />
                    )}
                    {msg.type === 'troll_audio' && (
                      <div className="flex-center" style={{ gap: '10px', background: 'rgba(0,0,0,0.05)', padding: '10px', borderRadius: '8px' }}>
                        <Volume2 size={24} color="var(--danger)" />
                        <audio src={msg.content} controls style={{ width: '200px', height: '40px' }} />
                      </div>
                    )}
                    {msg.type === 'poll' && (() => {
                      const pollData = JSON.parse(msg.content);
                      const totalVotes = pollData.options.reduce((sum, opt) => sum + opt.votes.length, 0);
                      return (
                        <div style={{ background: 'var(--surface)', padding: '15px', borderRadius: '8px', minWidth: '200px', border: '1px solid var(--border)' }}>
                          <div className="flex-center" style={{ gap: '5px', marginBottom: '10px', color: 'var(--primary)' }}>
                            <BarChart2 size={18} />
                            <span style={{ fontWeight: 'bold' }}>Anket</span>
                          </div>
                          <h4 style={{ margin: '0 0 15px 0', color: 'var(--text-primary)', wordBreak: 'break-word' }}>{pollData.question}</h4>
                          <div className="flex-col" style={{ gap: '8px' }}>
                            {pollData.options.map(opt => {
                              const isVoted = opt.votes.includes(currentUser.id);
                              const percentage = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                              return (
                                <div key={opt.id} onClick={() => handleVote(msg.id, msg.content, opt.id)} style={{ position: 'relative', background: 'rgba(0,0,0,0.05)', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', border: isVoted ? '1px solid var(--primary)' : '1px solid transparent' }}>
                                  <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${percentage}%`, background: isVoted ? 'rgba(59, 130, 246, 0.2)' : 'rgba(0,0,0,0.1)', transition: 'width 0.3s ease' }} />
                                  <div className="flex-between" style={{ position: 'relative', zIndex: 1, padding: '8px 12px', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--text-primary)', fontWeight: isVoted ? 'bold' : 'normal', wordBreak: 'break-word' }}>{opt.text}</span>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginLeft: '10px' }}>{opt.votes.length > 0 ? `${opt.votes.length} (${percentage}%)` : '0%'}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '10px', textAlign: 'right' }}>Toplam Oy: {totalVotes}</div>
                        </div>
                      );
                    })()}

                    <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textAlign: 'right', marginTop: '4px', display: 'flex', justifyContent: 'flex-end', gap: '4px', alignItems: 'center' }}>
                      {formatMessageTime(msg.created_at)}
                      {isMe && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: msg.read_by?.length > 1 ? 'var(--accent)' : 'inherit' }}>✓✓</span>
                          {msg.read_by?.length > 1 && (
                            <div style={{ display: 'flex', marginLeft: '2px', cursor: 'pointer' }} title={`Görenler: ${(msg.read_by || []).filter(id => id !== currentUser.id).map(id => participantProfiles[id]?.display_name || 'Biri').join(', ')}`}>
                              {(msg.read_by || []).filter(id => id !== currentUser.id).slice(0, 3).map((id, index) => (
                                <img 
                                  key={id}
                                  src={participantProfiles[id]?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(participantProfiles[id]?.display_name || 'B')}&background=random&color=fff&size=20`}
                                  style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid var(--surface)', marginLeft: index > 0 ? '-8px' : '0', zIndex: 10 - index, objectFit: 'cover' }}
                                  alt="Avatar"
                                />
                              ))}
                              {msg.read_by.length > 4 && <span style={{ fontSize: '0.65rem', marginLeft: '4px', color: 'var(--text-secondary)' }}>+{msg.read_by.length - 4}</span>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="glass shadow-sm" style={{ position: 'absolute', bottom: '-10px', [isMe ? 'right' : 'left']: '10px', padding: '2px 6px', borderRadius: '10px', fontSize: '0.8rem', display: 'flex', gap: '2px' }}>
                        {[...new Set(Object.values(msg.reactions))].map(em => <span key={em}>{em}</span>)}
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: '2px' }}>{Object.keys(msg.reactions).length > 1 ? Object.keys(msg.reactions).length : ''}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          
            {messages.length > 0 && 
              messages[messages.length - 1].sender_uid === currentUser.id && 
              messages[messages.length - 1].read_by?.length > 1 && 
              (new Date() - new Date(messages[messages.length - 1].created_at)) > 5 * 60 * 1000 && (
                <div className="flex-center" style={{ margin: '20px 0', animation: 'pulse 2s infinite' }}>
                  <div style={{ background: 'var(--danger)', color: '#fff', padding: '15px 25px', borderRadius: '12px', fontWeight: '900', textAlign: 'center', boxShadow: '0 0 20px rgba(239, 68, 68, 0.6)' }}>
                    🚨 {chatInfo?.type === 'dm' ? 'KARŞI TARAF' : 'BİRİLERİ'} SANA GÖRÜLDÜ ATTI ŞEREFSİZ! 🚨
                  </div>
                </div>
            )}

            {typingUsers.filter(u => u !== currentUser.id).length > 0 && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', paddingLeft: '10px' }}>{typingUsers.length > 1 ? 'Birileri yazıyor...' : 'Yazıyor...'}</div>}

          <div ref={messagesEndRef} />
        </div>

        {uploadProgress > 0 && uploadProgress < 100 && <div style={{ padding: '2px 15px', fontSize: '0.75rem', color: 'var(--primary)' }}>Yükleniyor...</div>}
        
        {/* Troll Menu Popup */}
        {showTrollMenu && (
          <div className="glass shadow-lg" style={{ position: 'absolute', bottom: '120px', left: '15px', padding: '15px', borderRadius: 'var(--radius-md)', zIndex: 30, display: 'flex', flexDirection: 'column', gap: '15px', width: '280px', maxHeight: '60vh', overflowY: 'auto' }}>
            <div className="flex-between">
              <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.9rem' }}>Troll Cephaneliği 💣</span>
              <button onClick={() => setShowTrollMenu(false)}><X size={18} color="var(--text-secondary)"/></button>
            </div>
            
            {isAdmin && (
              <>
                <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 'bold' }}>SADECE ADMİN (Ağır Silahlar) 💀</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button onClick={() => sendSpecialMessage('shake')} className="flex-center flex-col" style={{ gap: '5px', background: 'var(--danger)', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '0.8rem' }}>
                    <Zap size={18}/> Ekran Titret
                  </button>
                  <button onClick={() => sendSpecialMessage('flip')} className="flex-center flex-col" style={{ gap: '5px', background: 'var(--warning)', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '0.8rem' }}>
                    <RotateCcw size={18}/> Ters Çevir
                  </button>
                  <button onClick={() => sendSpecialMessage('jumpscare')} className="flex-center flex-col" style={{ gap: '5px', background: '#333', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '0.8rem' }}>
                    <Gift size={18}/> Jumpscare
                  </button>
                  <button onClick={() => sendSpecialMessage('roulette')} className="flex-center flex-col" style={{ gap: '5px', background: '#555', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '0.8rem' }}>
                    <Skull size={18}/> Rus Ruleti
                  </button>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '5px', display: 'block' }}>Kışkırtıcı Sesler:</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {TROLL_SOUNDS.map(snd => (
                      <button key={snd.name} onClick={() => sendSpecialMessage('troll_audio', snd.url)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '8px', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                        {snd.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', marginBottom: '10px' }}>
                  <label className="flex-center flex-col" style={{ gap: '5px', background: 'var(--primary)', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <ImageIcon size={18}/> Sohbet Arka Planı (Sadece Sen)
                    <input type="file" accept="image/*" onChange={handleBgUpload} style={{ display: 'none' }} />
                  </label>
                </div>
              </>
            )}

            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold' }}>MASUM TROLLER 👼</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button onClick={() => sendSpecialMessage('sleep')} className="flex-center flex-col" style={{ gap: '5px', background: 'var(--primary)', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '0.8rem' }}>
                <span style={{ fontSize: '1rem' }}>💤</span> Ekran Uyutma
              </button>
            </div>
            
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>OYUNLAR 🎮</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button onClick={startXoxGame} className="flex-center flex-col" style={{ gap: '5px', background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--accent)', padding: '10px', borderRadius: '8px', fontSize: '0.8rem' }}>
                  <Gamepad2 size={18} color="var(--accent)" /> XOX Oyna
                </button>
                <button onClick={playBottleGame} className="flex-center flex-col" style={{ gap: '5px', background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--warning)', padding: '10px', borderRadius: '8px', fontSize: '0.8rem' }}>
                  <Dices size={18} color="var(--warning)" /> Şişe Çevir
                </button>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '5px', display: 'block' }}>Eğlenceli Sesler:</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button onClick={() => sendSpecialMessage('troll_audio', 'https://raw.githubusercontent.com/wesbos/JavaScript30/master/01%20-%20JavaScript%20Drum%20Kit/sounds/clap.wav')} style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '8px', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-primary)' }}>Alkış 👏</button>
                  <button onClick={() => sendSpecialMessage('troll_audio', 'https://raw.githubusercontent.com/wesbos/JavaScript30/master/01%20-%20JavaScript%20Drum%20Kit/sounds/tink.wav')} style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '8px', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-primary)' }}>Zil Sesi 🔔</button>
                  <button onClick={() => sendSpecialMessage('troll_audio', 'https://raw.githubusercontent.com/wesbos/JavaScript30/master/01%20-%20JavaScript%20Drum%20Kit/sounds/boom.wav')} style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '8px', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-primary)' }}>Patlama 💥</button>
              </div>
            </div>

          </div>
        )}

        {/* Input Area (Banned Check) */}
        {timeLeft > 0 ? (
          <div className="glass flex-center" style={{ padding: '20px', borderTop: '1px solid var(--danger)', gap: '10px', background: 'rgba(239, 68, 68, 0.1)' }}>
            <Skull size={24} color="var(--danger)" />
            <span style={{ color: 'var(--danger)', fontWeight: '600' }}>Öldün! 💀 {timeLeft} saniye banlısın.</span>
          </div>
        ) : (
          <div className="glass flex-col" style={{ padding: '10px 15px', borderTop: '1px solid var(--border)', gap: '10px', zIndex: 10 }}>
            
            <div className="flex-between" style={{ padding: '0 5px', flexWrap: 'wrap', gap: '10px' }}>
              <button onClick={() => setShowTrollMenu(!showTrollMenu)} title="Troll Özellikler" style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--danger)', fontSize: '0.85rem', fontWeight: '500', background: 'rgba(239,68,68,0.1)', padding: '5px 10px', borderRadius: 'var(--radius-full)' }}>
                <Bomb size={16} /> Troll
              </button>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {isAdmin && (
                  <>
                    <button onClick={() => setIsFakeTyping(!isFakeTyping)} title="Fake Typing" style={{ background: isFakeTyping ? 'var(--primary)' : 'transparent', color: isFakeTyping ? '#fff' : 'var(--text-secondary)', padding: '5px 10px', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', transition: '0.2s' }}>
                      <Keyboard size={14} /> Fake Yazıyor
                    </button>
                    <button onClick={() => setIsZalgo(!isZalgo)} title="Zalgo Text" style={{ background: isZalgo ? '#8b5cf6' : 'transparent', color: isZalgo ? '#fff' : 'var(--text-secondary)', padding: '5px 10px', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', transition: '0.2s' }}>
                      <Ghost size={14} /> Zalgo
                    </button>
                  </>
                )}
                
                <button onClick={() => setIsSarcastic(!isSarcastic)} title="Alaycı Yazı (mErHaba)" style={{ background: isSarcastic ? '#f59e0b' : 'transparent', color: isSarcastic ? '#fff' : 'var(--text-secondary)', padding: '5px 10px', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', transition: '0.2s' }}>
                  <span style={{fontWeight:'bold'}}>aA</span> Alaycı
                </button>
                <button onClick={() => setIsCensor(!isCensor)} title="Otomatik Sansür" style={{ background: isCensor ? '#6b7280' : 'transparent', color: isCensor ? '#fff' : 'var(--text-secondary)', padding: '5px 10px', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', transition: '0.2s' }}>
                  <span style={{fontWeight:'bold'}}>***</span> Sansür
                </button>

                <button onClick={() => setIsAnonymous(!isAnonymous)} title="Anonim Mesaj" style={{ background: isAnonymous ? 'var(--danger)' : 'transparent', color: isAnonymous ? '#fff' : 'var(--text-secondary)', padding: '5px 10px', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', transition: '0.2s' }}>
                  <Ghost size={14} /> Anonim
                </button>
                <button onClick={() => setIsEphemeral(!isEphemeral)} title="Süreli Mesaj" style={{ background: isEphemeral ? 'var(--warning)' : 'transparent', color: isEphemeral ? '#fff' : 'var(--text-secondary)', padding: '5px 10px', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', transition: '0.2s' }}>
                  <Flame size={14} /> Süreli
                </button>
              </div>
            </div>

            {replyingTo && (
              <div className="flex-between" style={{ background: 'var(--surface)', padding: '8px 12px', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--accent)', marginBottom: '10px' }}>
                <div className="flex-col">
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: '600' }}>{replyingTo.sender_uid === currentUser.id ? 'Senin mesajın' : 'Yanıtlanıyor...'}</span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{replyingTo.type === 'text' ? replyingTo.content.substring(0, 50) : `[${replyingTo.type.toUpperCase()}]`}</span>
                </div>
                <button onClick={() => setReplyingTo(null)} style={{ padding: '5px', background: 'transparent', color: 'var(--text-secondary)' }}>✕</button>
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
              {!isRecording && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <label style={{ color: 'var(--text-secondary)', padding: '5px', cursor: 'pointer' }}>
                    <ImageIcon size={22} />
                    <input type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={(e) => { 
                      const f = e.target.files[0]; 
                      if(f) {
                        if (f.type.startsWith('image/')) {
                          setDoodleFile(f);
                        } else {
                          handleFileUpload(null, 'video', f);
                        }
                      }
                      e.target.value = null;
                    }} />
                  </label>
                  <label style={{ color: 'var(--text-secondary)', padding: '5px', cursor: 'pointer' }}>
                    <Paperclip size={22} />
                    <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'file')} />
                  </label>
                  
                </div>
              )}
            
              <form onSubmit={sendMessage} style={{ flex: 1, display: 'flex', gap: '10px', minWidth: '250px' }}>
                {isRecording ? (
                  <div className="flex-between" style={{ flex: 1, color: 'var(--danger)', fontWeight: '500', gap: '10px' }}>
                    <div className="flex-center" style={{ gap: '10px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--danger)' }} className="animate-pulse" />
                      Kaydediliyor...
                    </div>
                  </div>
                ) : (
                  <input type="text" value={text} onChange={handleTyping} onFocus={handleInputFocus} placeholder={isAnonymous ? "Gizlice yaz..." : (isZalgo ? "L̵a̶n̶e̵t̷l̷i̴ ̷y̴a̵z̴.̶.̶." : "Bir mesaj yazın...")} style={{ flex: 1, padding: '12px 15px', borderRadius: 'var(--radius-full)', background: isAnonymous ? '#fff0f0' : 'var(--surface)', border: isAnonymous ? '1px solid var(--danger)' : '1px solid var(--border)', fontSize: '0.95rem' }} />
                )}
                {text.trim() ? (
                  <button type="submit" disabled={sending} className="flex-center shadow-md" style={{ width: '45px', height: '45px', borderRadius: '50%', background: isAnonymous ? 'var(--danger)' : (isZalgo ? '#8b5cf6' : 'var(--primary)'), color: '#fff', opacity: sending ? 0.7 : 1 }}><Send size={20} style={{ marginLeft: '2px' }} /></button>
                ) : (
                  <button type="button" onClick={handleMicClick} className="flex-center shadow-md" style={{ width: '45px', height: '45px', borderRadius: '50%', background: isRecording ? 'var(--danger)' : 'var(--primary)', color: '#fff', transition: 'background 0.2s' }}>
                    {isRecording ? <StopCircle size={20} /> : <Mic size={20} />}
                  </button>
                )}
              </form>
            </div>
          </div>
        )}

      {/* Anket Modalı */}
      {showPollModal && (
        <div className="flex-center" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999 }}>
          <div className="glass flex-col" style={{ padding: '25px', borderRadius: 'var(--radius-lg)', width: '90%', maxWidth: '400px', gap: '15px' }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart2 size={20} /> Anket Oluştur
            </h3>
            <input 
              value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} 
              placeholder="Sorunuzu yazın..." 
              style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }} 
            />
            {pollOptions.map((opt, idx) => (
              <div key={idx} className="flex-center" style={{ gap: '10px' }}>
                <input 
                  value={opt} 
                  onChange={(e) => {
                    const newOpts = [...pollOptions];
                    newOpts[idx] = e.target.value;
                    setPollOptions(newOpts);
                  }}
                  placeholder={`${idx + 1}. Seçenek`} 
                  style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }} 
                />
                {pollOptions.length > 2 && (
                  <button onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))} style={{ background: 'var(--danger)', color: '#fff', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                    <Minus size={16} />
                  </button>
                )}
              </div>
            ))}
            {pollOptions.length < 5 && (
              <button onClick={() => setPollOptions([...pollOptions, ''])} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                <Plus size={16} /> Yeni Seçenek
              </button>
            )}
            <div className="flex-between" style={{ marginTop: '10px' }}>
              <button onClick={() => setShowPollModal(false)} className="btn-secondary" style={{ background: 'var(--surface-hover)' }}>İptal</button>
              <button onClick={createPoll} className="btn-primary">Gönder</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
