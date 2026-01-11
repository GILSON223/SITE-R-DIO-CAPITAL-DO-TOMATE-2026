
import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  MessageCircle, 
  Facebook, 
  Instagram,
  Info, 
  Music, 
  Radio, 
  Mic2,
  Share2,
  ChevronDown,
  Send,
  Loader2,
  Headphones,
  Check,
  Calendar,
  MapPin,
  Clock,
  ExternalLink,
  Users,
  MessageSquare
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { PlayerStatus, ChatMessage, SongInfo } from './types';

const LOGO_URL = "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800";
const STREAM_URL = "https://stm3.colossocast.com.br:7610/;"; 
const WHATSAPP_LINK = "https://api.whatsapp.com/send?phone=554284446445&text=Olá! Estou ouvindo a Rádio Capital do Tomate e gostaria de participar!";
const FACEBOOK_LINK = "https://www.facebook.com/web.capitaldotomate?mibextid=ZbWKwL";
const INSTAGRAM_LINK = "https://instagram.com/capitaldotomate";

const App: React.FC = () => {
  const [isAppVisible, setIsAppVisible] = useState(false);
  const [status, setStatus] = useState<PlayerStatus>(PlayerStatus.PAUSED);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [currentSong] = useState<SongInfo>({
    title: "O MELHOR DO SERTANEJO",
    artist: "RÁDIO CAPITAL DO TOMATE",
    albumArt: LOGO_URL
  });
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsAppVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const initVisualizer = () => {
    if (!audioRef.current || audioContextRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      renderFrame();
    } catch (e) {
      console.error("Visualizer Error:", e);
    }
  };

  const renderFrame = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);
      const barWidth = (width / bufferLength) * 2.5;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height;
        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, '#ef4444');
        gradient.addColorStop(1, '#f87171');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, height - barHeight, barWidth - 2, barHeight, [barWidth/2, barWidth/2, 0, 0]);
        } else {
          ctx.rect(x, height - barHeight, barWidth - 2, barHeight);
        }
        ctx.fill();
        x += barWidth + 1;
      }
    };
    draw();
  };

  useEffect(() => {
    audioRef.current = new Audio(STREAM_URL);
    audioRef.current.crossOrigin = "anonymous";
    audioRef.current.volume = volume;
    const audio = audioRef.current;
    
    const events = {
      playing: () => setStatus(PlayerStatus.PLAYING),
      pause: () => setStatus(PlayerStatus.PAUSED),
      waiting: () => setStatus(PlayerStatus.LOADING),
      error: () => setStatus(PlayerStatus.ERROR)
    };

    Object.entries(events).forEach(([ev, fn]) => audio.addEventListener(ev, fn));

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      audio.pause();
      Object.entries(events).forEach(([ev, fn]) => audio.removeEventListener(ev, fn));
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const togglePlay = async () => {
    if (!audioRef.current) return;
    if (status === PlayerStatus.PLAYING) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.src = STREAM_URL;
    } else {
      if (!audioContextRef.current) initVisualizer();
      else if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
      audioRef.current.play().catch(console.error);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Rádio Capital do Tomate',
      text: 'Sintonize o sucesso diretamente de Reserva-PR!',
      url: window.location.href,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (e) {}
    } else {
      await navigator.clipboard.writeText(window.location.href);
      setShowCopyFeedback(true);
      setTimeout(() => setShowCopyFeedback(false), 2000);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!userInput.trim() || isTyping) return;
    const userMessage = userInput.trim();
    setUserInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `O usuário disse: ${userMessage}`,
        config: {
          systemInstruction: `Você é o "Tomatinho", o mascote oficial da RÁDIO CAPITAL DO TOMATE de Reserva, PR. 
          Você é animado, carismático e ama o interior. Peça para o usuário sintonizar e peça músicas!`,
        }
      });
      setMessages(prev => [...prev, { role: 'assistant', content: response.text || "Estou meio fora do ar, tente de novo!" }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sinal fraco! Tente de novo, tchê!" }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-red-500/30">
      
      {/* Loading Overlay */}
      <div className={`fixed inset-0 z-[1000] bg-[#020617] flex flex-col items-center justify-center transition-all duration-1000 ${isAppVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="relative mb-6">
          <div className="absolute -inset-8 bg-red-600/20 blur-[50px] animate-pulse rounded-full"></div>
          <img src={LOGO_URL} alt="Logo" className="w-40 h-40 rounded-full object-cover border-4 border-red-600 shadow-2xl" />
        </div>
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin text-red-500" />
          <span className="font-bold tracking-widest text-sm uppercase">Sintonizando...</span>
        </div>
      </div>

      {/* Floating WhatsApp Button */}
      <button 
        onClick={() => window.open(WHATSAPP_LINK, '_blank')}
        className="fixed bottom-6 right-6 z-[600] w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white shadow-2xl hover:bg-green-400 transition-all transform hover:scale-110 active:scale-90 animate-whatsapp-pulse group"
        aria-label="Fale conosco no WhatsApp"
      >
        <MessageCircle size={32} className="group-hover:rotate-12 transition-transform" />
      </button>

      {/* Sticky Website Header */}
      <header className="sticky top-0 z-[500] w-full border-b border-white/5 bg-[#020617]/80 backdrop-blur-xl">
        <div className="max-width-7xl mx-auto px-4 h-20 flex items-center justify-between max-w-7xl">
          <div className="flex items-center gap-4">
            <img src={LOGO_URL} alt="Logo" className="w-12 h-12 rounded-xl border border-red-500/20 shadow-lg" />
            <div className="hidden sm:block">
              <h1 className="text-xl font-black italic tracking-tighter">CAPITAL DO <span className="text-red-500">TOMATE</span></h1>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                <MapPin size={10} className="text-red-500" /> Reserva • PR
              </div>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            {['Início'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-bold text-slate-400 hover:text-white transition-colors">{item}</a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={() => window.open(WHATSAPP_LINK)} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 px-5 py-2.5 rounded-xl text-xs font-black transition-all transform active:scale-95 shadow-lg shadow-green-900/20">
              <MessageCircle size={18} />
              <span className="hidden sm:inline">OUVIR & PARTICIPAR</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Site Section */}
      <main className="relative pt-10 pb-32">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Main Content Side */}
          <section className="lg:col-span-7 space-y-8 animate-slide-up">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-600/10 rounded-full border border-red-500/20">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Ao Vivo Agora</span>
              </div>
              <h2 className="text-5xl md:text-7xl font-black italic uppercase leading-[0.9] tracking-tight">
                A Voz Que <br/> <span className="text-red-500">Conecta</span> Você
              </h2>
              <p className="text-slate-400 text-lg max-w-xl leading-relaxed">
                Sintonize a Rádio Capital do Tomate e curta a melhor seleção de sertanejo, gaúcha e forró. De Reserva para o mundo, 24 horas por dia.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-panel p-5 rounded-3xl group hover:border-red-500/30 transition-all">
                <Users className="text-red-500 mb-3" size={24} />
                <h4 className="font-bold text-sm uppercase">Comunidade</h4>
                <p className="text-[10px] text-slate-500 mt-1">Milhares de ouvintes sintonizados.</p>
              </div>
              <div className="glass-panel p-5 rounded-3xl group hover:border-green-500/30 transition-all">
                <Music className="text-green-500 mb-3" size={24} />
                <h4 className="font-bold text-sm uppercase">Variedade</h4>
                <p className="text-[10px] text-slate-500 mt-1">O melhor da música regional.</p>
              </div>
              <div className="glass-panel p-5 rounded-3xl group hover:border-blue-500/30 transition-all">
                <Radio className="text-blue-500 mb-3" size={24} />
                <h4 className="font-bold text-sm uppercase">24 Horas</h4>
                <p className="text-[10px] text-slate-500 mt-1">Sempre no ar, sem interrupções.</p>
              </div>
            </div>
          </section>

          {/* Immersive Player Side */}
          <section className="lg:col-span-5 relative lg:sticky lg:top-32">
            <div className="relative group max-w-sm mx-auto">
              <div className={`absolute -inset-10 bg-red-600/20 blur-[80px] rounded-full transition-opacity duration-1000 ${status === PlayerStatus.PLAYING ? 'opacity-100' : 'opacity-0'}`}></div>
              
              <div className="relative glass-panel rounded-[40px] overflow-hidden border border-white/10 tomato-shadow">
                <div className="aspect-square relative overflow-hidden">
                  <img src={currentSong.albumArt} alt="Capa" className={`w-full h-full object-cover transition-all duration-[20s] ${status === PlayerStatus.PLAYING ? 'scale-110 rotate-1' : 'scale-100'}`} />
                  
                  {/* Integrated Visualizer */}
                  <div className="absolute inset-x-0 bottom-0 h-1/3 opacity-40 pointer-events-none">
                    <canvas ref={canvasRef} width={400} height={200} className="w-full h-full" />
                  </div>
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                  
                  <button onClick={handleShare} className="absolute top-6 right-6 w-12 h-12 glass-panel rounded-2xl flex items-center justify-center hover:bg-red-600 hover:text-white transition-all">
                    {showCopyFeedback ? <Check size={20} /> : <Share2 size={20} />}
                  </button>
                </div>

                <div className="p-8 space-y-6 text-center">
                  <div>
                    <h3 className="text-2xl font-black italic uppercase leading-none">{currentSong.title}</h3>
                    <p className="text-xs text-red-500 font-bold uppercase mt-2 tracking-widest">{currentSong.artist}</p>
                  </div>

                  <div className="flex items-center justify-center gap-6">
                    <button onClick={togglePlay} className="w-24 h-24 rounded-[32px] bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl shadow-red-900/40 transition-all active:scale-90">
                      {status === PlayerStatus.LOADING ? <Loader2 className="animate-spin" size={32} /> : status === PlayerStatus.PLAYING ? <Pause size={40} fill="currentColor" /> : <Play className="ml-2" size={40} fill="currentColor" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-4 px-4">
                    <Volume2 size={16} className="text-slate-500" />
                    <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume} onChange={(e) => {setVolume(parseFloat(e.target.value)); setIsMuted(false);}} className="flex-1 accent-red-600 h-1 bg-white/10 rounded-full appearance-none cursor-pointer" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Social & Chat Section */}
        <div className="max-w-7xl mx-auto px-4 mt-32 grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="glass-panel p-10 rounded-[48px] flex flex-col justify-center items-start space-y-6">
              <h3 className="text-4xl font-black italic uppercase">Fale com o <br/><span className="text-red-500">Tomatinho</span></h3>
              <p className="text-slate-400">Nosso assistente inteligente está pronto para ouvir seus pedidos de música e mandar um alô para você!</p>
              <button onClick={() => setChatOpen(true)} className="px-8 py-4 bg-white text-black rounded-2xl font-black uppercase text-sm hover:bg-red-600 hover:text-white transition-all flex items-center gap-3">
                <MessageCircle size={20} /> INICIAR CHAT AGORA
              </button>
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              <a href={WHATSAPP_LINK} target="_blank" className="glass-panel rounded-[40px] flex flex-col items-center justify-center p-8 hover:bg-green-600/10 transition-all border border-green-500/20 group">
                <MessageCircle size={48} className="text-green-500 mb-4 group-hover:scale-110 transition-transform" />
                <span className="font-black text-sm uppercase">WhatsApp</span>
              </a>
              <a href={FACEBOOK_LINK} target="_blank" className="glass-panel rounded-[40px] flex flex-col items-center justify-center p-8 hover:bg-blue-600/10 transition-all border border-blue-500/20 group">
                <Facebook size={48} className="text-blue-500 mb-4 group-hover:scale-110 transition-transform" />
                <span className="font-black text-sm uppercase">Facebook</span>
              </a>
              <a href={INSTAGRAM_LINK} target="_blank" className="glass-panel rounded-[40px] flex flex-col items-center justify-center p-8 hover:bg-pink-600/10 transition-all border border-pink-500/20 group">
                <Instagram size={48} className="text-pink-500 mb-4 group-hover:scale-110 transition-transform" />
                <span className="font-black text-sm uppercase">Instagram</span>
              </a>
           </div>
        </div>
      </main>

      {/* Website Footer */}
      <footer className="bg-[#010410] border-t border-white/5 pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <img src={LOGO_URL} alt="Logo" className="w-10 h-10 rounded-lg" />
              <h4 className="font-black italic uppercase text-lg">Capital do Tomate</h4>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">
              A rádio que pulsa no coração de Reserva-PR. Lealdade, música e informação para toda a família paranaense.
            </p>
          </div>
          
          <div className="space-y-6">
            <h5 className="font-black text-xs uppercase tracking-widest text-red-500">Links Úteis</h5>
            <nav className="flex flex-col gap-4 text-sm font-bold text-slate-400">
              <a href="#" className="hover:text-white transition-colors">Anuncie Conosco</a>
              <a href="#" className="hover:text-white transition-colors">Política de Privacidade</a>
              <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
            </nav>
          </div>

          <div className="space-y-6">
            <h5 className="font-black text-xs uppercase tracking-widest text-red-500">Onde Estamos</h5>
            <div className="space-y-4 text-sm text-slate-400 font-bold">
              <div className="flex gap-3">
                <MapPin size={18} className="text-red-500 shrink-0" />
                <span>Reserva, Paraná - Brasil</span>
              </div>
              <div className="flex gap-3">
                <MessageCircle size={18} className="text-red-500 shrink-0" />
                <span>(42) 8444-6445</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h5 className="font-black text-xs uppercase tracking-widest text-red-500">Aplicativo Mobile</h5>
            <div className="flex flex-col gap-3">
              <button onClick={() => window.open('https://play.google.com/store/apps/details?id=com.shoutcast.stm.colossocastadiocapitalc7610tgt5f')} className="bg-white/5 border border-white/10 p-3 rounded-2xl flex items-center gap-3 hover:bg-white/10 transition-all text-left">
                <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center text-red-500">
                  <ExternalLink size={20} />
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-slate-500">Disponível no</p>
                  <p className="font-black text-sm uppercase">Google Play</p>
                </div>
              </button>
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 pt-10 border-t border-white/5 text-center">
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em]">
            © {new Date().getFullYear()} Rádio Capital do Tomate. Todos os direitos reservados.
          </p>
        </div>
      </footer>

      {/* Floating Chat Modal */}
      {chatOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-xl glass-panel rounded-[48px] overflow-hidden flex flex-col h-[85vh] shadow-2xl">
            <div className="bg-red-600 p-8 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-3xl overflow-hidden p-1 shadow-lg">
                  <img src={LOGO_URL} alt="Tomatinho" className="w-full h-full object-cover rounded-[20px]" />
                </div>
                <div>
                  <h4 className="font-black text-2xl italic leading-none uppercase">Tomatinho</h4>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/70">Online para ajudar</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all">
                <ChevronDown size={28} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {messages.length === 0 ? (
                <div className="text-center py-20 space-y-6">
                  <div className="w-24 h-24 bg-red-600/10 rounded-[40px] flex items-center justify-center mx-auto border border-red-500/20">
                    <MessageCircle className="text-red-500" size={40} />
                  </div>
                  <div className="space-y-2">
                    <h5 className="text-2xl font-black italic uppercase">Bora Papear!</h5>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Peça sua música favorita!</p>
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                    <div className={`max-w-[85%] p-6 rounded-[32px] text-sm font-bold leading-relaxed shadow-xl ${
                      msg.role === 'user' ? 'bg-red-600 text-white rounded-br-none' : 'bg-white/5 text-slate-100 rounded-bl-none border border-white/10'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/5 p-6 rounded-[32px] rounded-bl-none border border-white/10 flex gap-2">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-6 bg-[#020617] border-t border-white/10 flex gap-4">
              <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="Mande seu recado para o Tomatinho..." className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-sm font-bold focus:outline-none focus:border-red-600 transition-all placeholder:text-slate-700" />
              <button type="submit" disabled={!userInput.trim() || isTyping} className="w-16 h-16 rounded-2xl bg-red-600 flex items-center justify-center text-white disabled:opacity-50 hover:bg-red-500 transition-all shadow-xl shadow-red-900/20">
                <Send size={28} />
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes whatsapp-pulse {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
          70% { box-shadow: 0 0 0 20px rgba(34, 197, 94, 0); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        .animate-slide-up { animation: slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
        .animate-whatsapp-pulse { animation: whatsapp-pulse 2s infinite; }
      `}</style>
    </div>
  );
};

export default App;
