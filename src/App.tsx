/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppScreen, MoodData, Valence, Arousal, World, Companion, Film } from './types';
import { useTypewriter } from './hooks/useTypewriter';
import { fetchRecommendations } from './services/tmdbService';
import { ChevronLeft, Home, Info, Heart, Share2, Star, Trash2, Bookmark, Volume2, VolumeX } from 'lucide-react';

import { audioService } from './services/audioService';

// --- Components ---

const WORLD_IMAGES = {
  mirror: {
    local: '/assets/world/mirror.png',
    fallback: 'https://ais-dev-3qajg4zfwoh4op7cd4flys-174743290885.europe-west3.run.app/mirror_file_0.png',
  },
  door: {
    local: '/assets/world/door.png',
    fallback: 'https://ais-dev-3qajg4zfwoh4op7cd4flys-174743290885.europe-west3.run.app/door_file_1.png',
  },
};

const SIGNAL_LABELS = [
  {
    title: 'Ana sinyal',
    subtitle: 'Bu geceye en yakın iz',
  },
  {
    title: 'Hafif sinyal',
    subtitle: 'Daha yumuşak bir kapı',
  },
  {
    title: 'Karanlık sinyal',
    subtitle: 'Biraz daha derine',
  },
];

const companionCopy: Record<Companion, string> = {
  alone: 'Bu film yalnız izlenince sesini daha net duyurur.',
  together: 'Bu seçim yanında biri varken bile içindeki o küçük sessizliği korur.',
  any: 'Bu sinyal yanında kim olursa olsun bozulmayacak kadar açık.',
};

const getOracleReason = (film: Film, mood: MoodData, signalIndex: number) => {
  const worldLine = mood.world === 'mirror'
    ? 'Aynayı seçtin; bu yüzden hikayenin sana bir cevap değil, bir yansıma bırakmasını istedim.'
    : 'Kapıyı seçtin; bu yüzden hikayenin seni bulunduğun odadan biraz uzaklaştırmasını istedim.';
  const tempoLine = mood.arousal === 'fast'
    ? 'Ritmin hızlıydı, o yüzden içinde hareket eden şeyi durdurmadan başka bir yöne çevirecek bir film geldi.'
    : 'Ritmin yavaştı, o yüzden acele etmeyen ama içeride iz bırakan bir film geldi.';
  const signalLine = signalIndex === 1
    ? 'Bu, gecenin daha yumuşak ihtimali.'
    : signalIndex === 2
      ? 'Bu, gözünü biraz daha karanlığa alıştıran ihtimal.'
      : 'Bu, seçtiğin izlerin ortasında en güçlü duran sinyal.';
  const companionLine = mood.companion ? companionCopy[mood.companion] : '';

  return `${signalLine} ${worldLine} ${tempoLine} ${companionLine} ${film.title} bu yüzden geldi.`;
};

const OracleBackground = () => {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-black">
      {/* Aurora-like waves */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 5, 0],
          opacity: [0.2, 0.35, 0.2],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute -top-[20%] -left-[10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_50%_50%,rgba(255,110,180,0.06)_0%,transparent_50%)] blur-[100px]"
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          rotate: [0, -5, 0],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute -bottom-[20%] -right-[10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_30%_70%,rgba(255,110,180,0.04)_0%,transparent_60%)] blur-[100px]"
      />
      
      {/* Moving Light Beams */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            x: ['-100%', '200%'],
            opacity: [0, 0.08, 0]
          }}
          transition={{
            duration: 15 + i * 5,
            repeat: Infinity,
            delay: i * 4,
            ease: "easeInOut"
          }}
          className="absolute top-0 w-[500px] h-full bg-gradient-to-r from-transparent via-oracle/8 to-transparent skew-x-12 blur-[120px]"
        />
      ))}
    </div>
  );
};

const SequentialTypewriter = ({ 
  sentences, 
  onComplete, 
  className = "",
  speed = 40,
  delayBetween = 800
}: { 
  sentences: string[], 
  onComplete?: () => void, 
  className?: string,
  speed?: number,
  delayBetween?: number
}) => {
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [completedSentences, setCompletedSentences] = useState<string[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleSentenceComplete = () => {
    if (currentSentenceIndex < sentences.length - 1) {
      // Small pause before moving to next sentence
      timeoutRef.current = setTimeout(() => {
        setCompletedSentences(prev => [...prev, sentences[currentSentenceIndex]]);
        setCurrentSentenceIndex(prev => prev + 1);
      }, delayBetween);
    } else {
      onComplete?.();
    }
  };

  const { displayedText, isComplete } = useTypewriter(
    sentences[currentSentenceIndex], 
    speed, 
    0, 
    handleSentenceComplete
  );

  return (
    <div className={`font-serif italic text-xl leading-relaxed text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] max-w-[340px] text-center space-y-2 ${className}`}>
      {completedSentences.map((s, i) => (
        <p key={i}>{s}</p>
      ))}
      <p>
        {displayedText}
        {!isComplete && <span className="oracle-cursor" />}
      </p>
    </div>
  );
};

const OracleText = ({ text, delay = 0, onComplete, className = "" }: { text: string | undefined, delay?: number, onComplete?: () => void, className?: string }) => {
  const safeText = text || "";
  const { displayedText, isComplete } = useTypewriter(safeText, 40, delay, onComplete);
  
  if (!text) return null;

  return (
    <div className={`font-serif italic text-xl leading-relaxed text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] max-w-[340px] text-center ${className}`}>
      {displayedText}
      {!isComplete && <span className="oracle-cursor" />}
    </div>
  );
};

const Navigation = ({ onBack, onHome, isMuted, onToggleMute, showBack = true }: { 
  onBack: () => void, 
  onHome: () => void, 
  isMuted: boolean,
  onToggleMute: () => void,
  showBack?: boolean 
}) => {
  return (
    <div className="fixed top-0 left-0 w-full app-navigation flex justify-between items-center px-5 z-[100] pointer-events-none">
      <div className="w-12 h-12 flex items-center justify-start pointer-events-auto">
        {showBack && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            whileHover={{ opacity: 1 }}
            onClick={() => {
              audioService.playEffect('ui_click', 0.3);
              onBack();
            }}
            className="nav-icon-button text-white/85"
            aria-label="Geri dön"
          >
            <ChevronLeft size={24} strokeWidth={1.7} />
          </motion.button>
        )}
      </div>
      
      <div className="flex items-center gap-3 pointer-events-auto">
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: isMuted ? 0.45 : 0.85 }}
          whileHover={{ opacity: 1 }}
          onClick={onToggleMute}
          className="nav-icon-button text-white"
          aria-label={isMuted ? "Sesi aç" : "Sesi kapat"}
        >
          {isMuted ? (
            <VolumeX size={22} strokeWidth={1.5} className="text-white/50" />
          ) : (
            <Volume2 size={22} strokeWidth={1.5} className="text-oracle drop-shadow-[0_0_8px_rgba(255,110,180,0.5)]" />
          )}
        </motion.button>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.85 }}
          whileHover={{ opacity: 1 }}
          onClick={() => {
            audioService.playEffect('ui_click', 0.3);
            onHome();
          }}
          className="nav-icon-button text-white/90"
          aria-label="Ana ekrana dön"
        >
          <Home size={22} strokeWidth={1.8} />
        </motion.button>
      </div>
    </div>
  );
};

const ProgressIndicator = ({ currentStep }: { currentStep: number }) => {
  return (
    <div className="fixed app-progress left-1/2 -translate-x-1/2 flex gap-3 z-[110]" role="status" aria-label={`Adım ${currentStep || 1} / 5`}>
      {[1, 2, 3, 4, 5].map((step) => (
        <div
          key={step}
          className={`w-1 h-1 rounded-full transition-all duration-700 ease-in-out ${
            step === currentStep 
              ? 'bg-white scale-[1.8] shadow-[0_0_8px_rgba(255,255,255,0.5)]' 
              : step < currentStep 
                ? 'bg-oracle' 
                : 'bg-white/10'
          }`}
        />
      ))}
    </div>
  );
};

// --- Screens ---

const IntroScreen = ({ onNext, onCollection }: { onNext: () => void, onCollection: () => void }) => {
  const [step, setStep] = useState(0);
  const [showOptions, setShowOptions] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-10 safe-area-top safe-area-bottom bg-transparent">
      {step === 0 && (
        <motion.div 
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 80, opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.8, ease: "easeInOut" }}
          onAnimationComplete={() => setTimeout(() => setStep(1), 1000)}
          className="h-[1px] bg-white absolute shadow-[0_0_10px_rgba(255,255,255,0.3)]"
        />
      )}
      
      {step >= 1 && (
        <div className="flex flex-col items-center">
          <SequentialTypewriter 
            sentences={[
              "Tekrar geldin.",
              "Bugün bir şeyler oldu ya da hiçbir şey olmadı, fark etmez.",
              "Her iki durumda da buradasın.",
              "Hazır mısın?"
            ]}
            onComplete={() => setShowOptions(true)}
          />
        </div>
      )}

      <AnimatePresence>
        {showOptions && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="absolute bottom-32 w-full flex flex-col items-center gap-6"
          >
            <button 
              onClick={() => {
                audioService.playEffect('ui_click', 0.1);
                onNext();
              }}
              className="font-serif text-white text-xl tracking-wide hover:text-oracle transition-all duration-500 ease-in-out"
            >
              Evet.
            </button>
            <motion.button 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              onClick={() => {
                audioService.playEffect('ui_click', 0.1);
                onCollection();
              }}
              className="font-manrope text-white/30 text-[10px] tracking-[0.4em] uppercase hover:text-white/60 transition-colors border-b border-white/5 pb-1"
            >
              Koleksiyonum
            </motion.button>
            <div className="w-32 h-[1px] bg-gradient-to-r from-transparent via-oracle/40 to-transparent" />
            <button 
              className="font-sans text-white/30 text-sm font-light hover:text-white transition-all duration-500 ease-in-out"
              onClick={() => {
                audioService.playEffect('ui_click', 0.1);
              }}
            >
              Bir dakika lazım.
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ColorScreen = ({ onSelect }: { onSelect: (valence: Valence) => void }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [showNext, setShowNext] = useState(false);
  const [oracleResponse, setOracleResponse] = useState("");

  const colors = [
    { hex: "#6B1A2A", label: "Kasvetli", valence: 'negative' as const },
    { hex: "#8A8E91", label: "Boş", valence: 'negative' as const },
    { hex: "#1A3AFF", label: "Mesafeli", valence: 'negative' as const },
    { hex: "#D47B2A", label: "Sıcak", valence: 'positive' as const },
    { hex: "#E8EAEC", label: "Berrak", valence: 'positive' as const },
    { hex: "#0D0014", label: "Karanlık", valence: 'negative' as const },
  ];

  const handleSelect = (index: number) => {
    setSelected(index);
    const color = colors[index].label;
    
    // Trigger unique refined sounds
    switch(color) {
      case 'Kasvetli': // Burgundy
        audioService.playEffect('cello_D2', 0.5);
        break;
      case 'Boş': // Grey
        audioService.playWhiteNoise(0.6, 0.1);
        break;
      case 'Mesafeli': // Blue
        audioService.playEffect('piano_E5', 0.4);
        break;
      case 'Sıcak': // Amber
        audioService.playChord(['piano_F3', 'piano_A3', 'piano_C4'], 0.4); // Fmaj
        break;
      case 'Berrak': // White
        audioService.playSine(440, 1.2, 0.25); // A4 Sine
        break;
      case 'Karanlık': // Black
        audioService.playSubFrequency(35, 2, 0.5); // Sub frequency (35Hz)
        break;
    }

    const valence = colors[index].valence;
    if (valence === 'negative') {
      setOracleResponse("Anlıyorum. Bugün o tür bir gün.");
    } else {
      setOracleResponse("İyi. Bir ışık var içinde bu gece.");
    }
    setTimeout(() => setShowNext(true), 1200);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-6 pt-12 pb-24 safe-area-top safe-area-bottom bg-transparent">
      <OracleText text="Gözlerini kapattığında şu an hangi rengi görüyorsun?" className="mb-2" />
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 2.5, duration: 1 }}
        className="text-[11px] text-white italic font-serif mb-8"
      >
        Sadece hisset. Düşünme.
      </motion.div>

      <div className="grid grid-cols-2 gap-6 w-full max-w-[280px]">
        {colors.map((c, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ 
              opacity: selected === null ? 1 : selected === i ? 1 : 0.2,
              scale: 1 
            }}
            whileHover={{ scale: 1.05, boxShadow: `0 0 25px ${c.hex}66` }}
            whileTap={{ scale: 1.02 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
                onClick={() => selected === null && handleSelect(i)}
                className="relative h-20 rounded-2xl overflow-hidden group"
                aria-label={`${c.label} rengini seç`}
                style={{ 
              backgroundColor: c.hex,
              border: selected === i ? '1px solid #FF6EB4' : '1px solid rgba(255,255,255,0.05)',
              boxShadow: selected === i ? `0 0 30px ${c.hex}88` : 'none'
            }}
          >
            <AnimatePresence>
              <motion.span 
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] text-[11px] uppercase tracking-widest font-manrope font-light text-white"
              >
                {c.label}
              </motion.span>
            </AnimatePresence>
            {selected === i && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="w-1.5 h-1.5 bg-oracle rounded-full shadow-[0_0_15px_#FF6EB4]" />
              </motion.div>
            )}
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/35 px-3 py-1 text-[9px] uppercase tracking-widest font-manrope font-light text-white/80 backdrop-blur-sm">
              {c.label}
            </span>
          </motion.button>
        ))}
      </div>

      <div className="min-h-[5rem] flex items-center justify-center mt-8">
        <AnimatePresence>
          {oracleResponse && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-serif italic text-white/70 text-center px-4"
            >
              <OracleText text={oracleResponse} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showNext && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => {
              audioService.playEffect('ui_click', 0.5);
              onSelect(colors[selected!].valence);
            }}
            className="absolute bottom-32 text-oracle text-sm tracking-[0.2em] font-manrope font-light uppercase px-6 py-3 border border-oracle/20 rounded-full hover:bg-oracle/5 transition-all"
          >
            → Devam et
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

const TempoScreen = ({ onSelect }: { onSelect: (arousal: Arousal) => void }) => {
  const [selected, setSelected] = useState<Arousal | null>(null);
  const [oracleResponse, setOracleResponse] = useState("");

  const handleSelect = (val: Arousal) => {
    audioService.playEffect('ui_click', 0.4);
    setSelected(val);
    if (val === 'fast') {
      setOracleResponse("Enerji var içinde. İyi.");
    } else {
      setOracleResponse("Sakin olmak istiyorsun. Anlıyorum.");
    }
    setTimeout(() => onSelect(val), 2500);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full safe-area-top safe-area-bottom bg-transparent pt-12 pb-24">
      <OracleText text="Bu gece kalbinin ritmi nasıl? Bir yürüyüş mü, yoksa bir sürüklenme mi?" className="mb-12" />

      <div className="flex flex-col w-full relative px-10">
        <div className="relative h-64 w-full flex items-center justify-center">
          {/* Vertical Divider */}
          <motion.div 
            initial={{ height: 0 }}
            animate={{ height: '100%' }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute left-1/2 top-0 w-[1px] bg-oracle/30 z-10" 
          />
          
          {/* Horizontal Line Container */}
          <div className="flex w-full items-center relative">
            {/* Energy Core at the center */}
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
                boxShadow: [
                  "0 0 10px #FF6EB4",
                  "0 0 25px #FF6EB4",
                  "0 0 10px #FF6EB4"
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full z-20"
            />

            {/* Left side: Subtle Wave (Yürüyüş) */}
            <button 
              onClick={() => !selected && handleSelect('slow')}
              className={`flex-1 h-32 flex items-center justify-end transition-all duration-1000 ease-in-out relative group ${selected === 'fast' ? 'opacity-10' : 'opacity-100'}`}
            >
              <svg width="100%" height="60" viewBox="0 0 100 60" preserveAspectRatio="none" className="overflow-visible">
                <defs>
                  <filter id="glow-left" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                <motion.path
                  d="M 0 30 Q 25 28, 50 30 T 100 30"
                  fill="none"
                  stroke="#FF6EB4"
                  strokeWidth="2"
                  filter="url(#glow-left)"
                  animate={{ 
                    d: [
                      "M 0 30 Q 25 28, 50 30 T 100 30",
                      "M 0 30 Q 25 32, 50 30 T 100 30",
                      "M 0 30 Q 25 28, 50 30 T 100 30"
                    ],
                    strokeOpacity: [0.6, 0.9, 0.6],
                    strokeWidth: [2, 2.5, 2]
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
                {/* Particles */}
                <motion.circle r="1.5" fill="#fff">
                  <animateMotion 
                    dur="3s" 
                    repeatCount="indefinite" 
                    path="M 0 30 Q 25 28, 50 30 T 100 30" 
                  />
                </motion.circle>
              </svg>
              <div className="absolute inset-0 bg-oracle/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-l-2xl" />
            </button>

            {/* Right side: Dramatic Wave (Sürüklenme) */}
            <button 
              onClick={() => !selected && handleSelect('fast')}
              className={`flex-1 h-32 flex items-center justify-start transition-all duration-1000 ease-in-out relative group ${selected === 'slow' ? 'opacity-10' : 'opacity-100'}`}
            >
              <svg width="100%" height="60" viewBox="0 0 100 60" preserveAspectRatio="none" className="overflow-visible">
                <defs>
                  <filter id="glow-right" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                <motion.path
                  d="M 0 30 L 10 10 L 25 50 L 40 5 L 55 55 L 75 15 L 90 45 L 100 30"
                  fill="none"
                  stroke="#FF6EB4"
                  strokeWidth="2"
                  filter="url(#glow-right)"
                  animate={{ 
                    d: [
                      "M 0 30 L 10 10 L 25 50 L 40 5 L 55 55 L 75 15 L 90 45 L 100 30",
                      "M 0 30 L 15 45 L 30 10 L 45 55 L 60 5 L 75 50 L 85 15 L 100 30",
                      "M 0 30 L 10 10 L 25 50 L 40 5 L 55 55 L 75 15 L 90 45 L 100 30"
                    ],
                    strokeOpacity: [0.7, 1, 0.7],
                    strokeWidth: [2, 3, 2]
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                {/* Particles */}
                <motion.circle r="2" fill="#fff" className="shadow-[0_0_8px_#fff]">
                  <animateMotion 
                    dur="1.5s" 
                    repeatCount="indefinite" 
                    path="M 0 30 L 10 10 L 25 50 L 40 5 L 55 55 L 75 15 L 90 45 L 100 30" 
                  />
                </motion.circle>
              </svg>
              <div className="absolute inset-0 bg-oracle/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-r-2xl" />
            </button>
          </div>
        </div>

        <div className="flex w-full justify-between mt-10 px-4">
          <span className="text-[13px] text-white/40 font-manrope font-light tracking-widest uppercase">Yürüyüş</span>
          <span className="text-[13px] text-white/40 font-manrope font-light tracking-widest uppercase">Sürüklenme</span>
        </div>
      </div>

      <div className="min-h-[4rem] flex items-center justify-center mt-8">
        <AnimatePresence>
          {oracleResponse && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-serif italic text-white/70 text-center px-10"
            >
              <OracleText text={oracleResponse} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const WorldScreen = ({ onSelect }: { onSelect: (world: World) => void }) => {
  const [selected, setSelected] = useState<World | null>(null);
  const [oracleResponse, setOracleResponse] = useState("");

  const handleSelect = (val: World) => {
    audioService.playEffect('ui_click', 0.4);
    setSelected(val);
    if (val === 'mirror') {
      setOracleResponse("Gerçekliğin içinde kalmak istiyorsun. Anlamlı bir seçim.");
    } else {
      setOracleResponse("Kaçmak istiyorsun. Sana başka bir yer göstereceğim.");
    }
    setTimeout(() => onSelect(val), 2500);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full relative overflow-hidden bg-transparent">
      <AnimatePresence>
        {!selected && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none px-12"
          >
            <OracleText 
              text="Bu gece bir ayna mı istiyorsun — yoksa bir çıkış kapısı mı?" 
              className="text-center drop-shadow-[0_0_25px_rgba(0,0,0,1)] text-2xl leading-relaxed"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 flex">
        {/* Mirror - Left */}
        <motion.button
          onClick={() => !selected && handleSelect('mirror')}
          animate={{ 
            width: selected === 'mirror' ? '100%' : selected === 'escape' ? '0%' : '50%',
            filter: selected === 'escape' ? 'brightness(0)' : 'brightness(1)'
          }}
          transition={{ duration: 1.5, ease: [0.6, 0.01, -0.05, 0.95] }}
          className="h-full bg-[#050505] relative overflow-hidden group"
        >
          <img 
            src={WORLD_IMAGES.mirror.local}
            className="absolute inset-0 w-full h-full object-contain opacity-35 group-hover:opacity-60 transition-all duration-2000 ease-in-out scale-110 group-hover:scale-100"
            onError={(event) => {
              event.currentTarget.src = WORLD_IMAGES.mirror.fallback;
            }}
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-transparent opacity-80" />
          <motion.div 
            animate={{ opacity: selected === 'escape' ? 0 : 1 }}
            className="absolute bottom-32 left-12 flex flex-col items-start gap-2"
          >
            <span className="font-serif text-white/50 text-2xl tracking-[0.3em] uppercase group-hover:text-white group-hover:tracking-[0.4em] transition-all duration-700">
              Ayna
            </span>
            <div className="w-8 h-[1px] bg-oracle group-hover:w-16 transition-all duration-700" />
          </motion.div>
        </motion.button>

        {/* Door - Right */}
        <motion.button
          onClick={() => !selected && handleSelect('escape')}
          animate={{ 
            width: selected === 'escape' ? '100%' : selected === 'mirror' ? '0%' : '50%',
            filter: selected === 'mirror' ? 'brightness(0)' : 'brightness(1)'
          }}
          transition={{ duration: 1.5, ease: [0.6, 0.01, -0.05, 0.95] }}
          className="h-full bg-[#050505] relative overflow-hidden group"
        >
          <div className="absolute inset-0 border-l border-oracle/20 z-30" />
          <img 
            src={WORLD_IMAGES.door.local}
            className="absolute inset-0 w-full h-full object-contain opacity-35 group-hover:opacity-60 transition-all duration-2000 ease-in-out scale-110 group-hover:scale-100"
            onError={(event) => {
              event.currentTarget.src = WORLD_IMAGES.door.fallback;
            }}
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-black via-transparent to-transparent opacity-80" />
          <motion.div 
            animate={{ opacity: selected === 'mirror' ? 0 : 1 }}
            className="absolute bottom-32 right-12 flex flex-col items-end gap-2"
          >
            <span className="font-serif text-white/50 text-2xl tracking-[0.3em] uppercase group-hover:text-white group-hover:tracking-[0.4em] transition-all duration-700">
              Kapı
            </span>
            <div className="w-8 h-[1px] bg-oracle group-hover:w-16 transition-all duration-700" />
          </motion.div>
        </motion.button>

        {/* Center Pulsing Separator */}
        <motion.div 
          animate={{ 
            left: selected === 'mirror' ? '100%' : selected === 'escape' ? '0%' : '50%',
            opacity: selected ? 0 : [0.3, 0.6, 0.3],
            scaleY: [1, 1.05, 1]
          }}
          transition={{ 
            left: { duration: 1.5, ease: [0.6, 0.01, -0.05, 0.95] },
            opacity: { duration: 3, repeat: Infinity },
            scaleY: { duration: 4, repeat: Infinity }
          }}
          className="absolute top-0 bottom-0 w-[1px] bg-oracle shadow-[0_0_20px_rgba(255,110,180,0.5)] z-40 -translate-x-1/2" 
        />
      </div>

      {/* Response Display */}
      <div className="absolute top-[40%] left-0 w-full z-50 pointer-events-none -translate-y-1/2">
        <AnimatePresence>
          {oracleResponse && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="px-12 flex justify-center"
            >
              <OracleText 
                text={oracleResponse} 
                className="text-3xl font-serif text-white drop-shadow-[0_0_30px_rgba(0,0,0,1)]"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const CompanionScreen = ({ onSelect }: { onSelect: (companion: Companion) => void }) => {
  const [selected, setSelected] = useState<Companion | null>(null);
  const [oracleResponse, setOracleResponse] = useState("");

  const options: Array<{ value: Companion; label: string; whisper: string }> = [
    { value: 'alone', label: 'Yalnız', whisper: 'Oda sadece sana kalsın.' },
    { value: 'together', label: 'Biriyle', whisper: 'Sessizliği iki kişi paylaşsın.' },
    { value: 'any', label: 'Fark etmez', whisper: 'Film kimin geldiğini bilmeden konuşsun.' },
  ];

  const handleSelect = (companion: Companion) => {
    audioService.playEffect('ui_click', 0.4);
    setSelected(companion);

    if (companion === 'alone') {
      setOracleResponse("Tamam. Bu gece film sana daha yakından konuşacak.");
    } else if (companion === 'together') {
      setOracleResponse("Tamam. Yanındaki sessizlik de hesaba katıldı.");
    } else {
      setOracleResponse("Tamam. Kapı açık kalsın.");
    }

    setTimeout(() => onSelect(companion), 2200);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8 safe-area-top safe-area-bottom bg-transparent">
      <OracleText
        text="Bu gece perde açıldığında odada kim var?"
        className="mb-12 text-2xl leading-relaxed"
      />

      <div className="w-full max-w-[320px] flex flex-col gap-4">
        {options.map((option, index) => (
          <motion.button
            key={option.value}
            initial={{ opacity: 0, y: 18 }}
            animate={{
              opacity: selected === null ? 1 : selected === option.value ? 1 : 0.18,
              y: 0,
              scale: selected === option.value ? 1.02 : 1,
            }}
            transition={{ delay: index * 0.12, duration: 0.7, ease: "easeOut" }}
            onClick={() => !selected && handleSelect(option.value)}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-left backdrop-blur-md transition-colors hover:bg-white/10"
          >
            <span className="block font-serif text-2xl text-white/85">{option.label}</span>
            <span className="mt-1 block font-manrope text-[10px] uppercase tracking-[0.22em] text-white/35">
              {option.whisper}
            </span>
            {selected === option.value && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                className="absolute bottom-0 left-0 h-[1px] w-full origin-left bg-oracle shadow-[0_0_14px_#FF6EB4]"
              />
            )}
          </motion.button>
        ))}
      </div>

      <div className="mt-10 min-h-[5rem] flex items-center justify-center">
        <AnimatePresence>
          {oracleResponse && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <OracleText text={oracleResponse} className="text-white/75" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const PauseScreen = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-transparent">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.5, 2], opacity: [0, 0.5, 0] }}
        transition={{ duration: 2.5, repeat: 1 }}
        className="absolute w-40 h-40 border border-oracle rounded-full"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 2, delay: 0.5 }}
        className="font-serif italic text-white text-lg"
      >
        Seni duydum.
      </motion.div>
    </div>
  );
};

const CollectionScreen = ({ onBack, onShowDetails }: { onBack: () => void, onShowDetails: (film: Film) => void }) => {
  const [favorites, setFavorites] = useState<Film[]>([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('moodplay_films') || '[]');
    setFavorites(stored);
  }, []);

  const removeFavorite = (id: number) => {
    const updated = favorites.filter(f => f.id !== id);
    setFavorites(updated);
    localStorage.setItem('moodplay_films', JSON.stringify(updated));
    
    // Also sync with IDs if we were using them elsewhere
    const ids = updated.map(f => f.id);
    localStorage.setItem('moodplay_favorites', JSON.stringify(ids));
  };

  return (
    <div className="flex flex-col h-full w-full bg-transparent relative safe-area-top safe-area-bottom overflow-y-auto">
      <div className="px-8 pt-12 pb-24">
        <div className="flex items-center gap-4 mb-10">
          <button onClick={onBack} className="text-white/40 hover:text-white transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-serif text-2xl text-white tracking-widest uppercase">Koleksiyon</h1>
        </div>

        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <Bookmark size={48} className="text-white/10 mb-6" />
            <p className="font-manrope text-white/30 text-sm tracking-wide">Henüz hiçbir sinyal kaydedilmedi.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {favorites.map((film) => (
              <motion.div 
                key={film.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative h-48 rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm"
              >
                <img src={film.stillUrl} className="absolute inset-0 w-full h-full object-cover opacity-40 transition-transform duration-1000 group-hover:scale-110" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                
                <div className="relative h-full flex flex-col justify-center p-6 pr-24">
                  <h3 className="font-serif text-xl text-white mb-1">{film.title}</h3>
                  <p className="text-white/50 text-xs font-manrope">{film.year} · {film.director}</p>
                  <button 
                    onClick={() => {
                      audioService.playEffect('ui_click', 0.4);
                      onShowDetails(film);
                    }}
                    className="mt-4 self-start text-[10px] text-oracle uppercase tracking-widest border-b border-oracle/30 pb-0.5 hover:border-oracle transition-colors"
                  >
                    Detayları Gör
                  </button>
                </div>

                <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-3">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      audioService.playEffect('ui_click', 0.4);
                      removeFavorite(film.id);
                    }}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-white/40 hover:text-red-400 hover:bg-white/10 transition-all"
                  >
                    <Trash2 size={18} />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const DetailsScreen = ({ film, onBack }: { film: Film, onBack: () => void }) => {
  return (
    <div className="flex flex-col h-full w-full bg-transparent relative safe-area-top safe-area-bottom overflow-y-auto">
      <div className="absolute top-0 left-0 w-full h-80 z-0">
        <img src={film.stillUrl} className="w-full h-full object-cover opacity-60" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black" />
      </div>

      <div className="relative z-10 px-8 pt-64 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="font-serif text-3xl text-white mb-1">{film.title}</h1>
              <p className="text-oracle text-sm font-manrope">{film.year} · {film.director}</p>
            </div>
            <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg backdrop-blur-md">
              <Star size={14} className="text-yellow-500 fill-yellow-500" />
              <span className="text-white text-xs font-bold">{film.rating}</span>
            </div>
          </div>

          <div className="mb-8 p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
            <h3 className="text-white/40 text-[10px] uppercase tracking-widest mb-3 font-manrope">Özet</h3>
            <p className="text-white/80 text-sm leading-relaxed font-light">{film.synopsis}</p>
          </div>

          <div className="mb-12">
            <h3 className="text-white/40 text-[10px] uppercase tracking-widest mb-4 font-manrope">Oyuncular</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {film.cast.map((name, i) => (
                <div key={i} className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl whitespace-nowrap">
                  <span className="text-white/90 text-sm font-light">{name}</span>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={() => {
              audioService.playEffect('ui_click', 0.4);
              onBack();
            }}
            className="w-full py-4 bg-white/10 hover:bg-white/20 transition-colors rounded-2xl text-white font-manrope font-light text-sm tracking-widest uppercase"
          >
            Geri Dön
          </button>
        </motion.div>
      </div>
    </div>
  );
};

const VerdictScreen = ({ mood, onReset, onShowDetails }: { mood: MoodData, onReset: () => void, onShowDetails: (film: Film) => void }) => {
  const [currentFilmIndex, setCurrentFilmIndex] = useState(0);
  const [selectedSignalIndex, setSelectedSignalIndex] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [showSignalSecret, setShowSignalSecret] = useState(false);
  const [films, setFilms] = useState<Film[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    async function getFilms() {
      setShowContent(false);
      setLoading(true);
      setError(null);
      const result = await fetchRecommendations(mood);
      if (result.error) {
        setError(result.error);
      } else {
        setFilms(result.films);
        setCurrentFilmIndex(0);
        setSelectedSignalIndex(0);
        setShowSignalSecret(false);
      }
      setLoading(false);
    }
    getFilms();
  }, [mood, retryCount]);

  const signalFilms = SIGNAL_LABELS.map((_, index) => films[(currentFilmIndex + index) % films.length]).filter(Boolean);
  const currentFilm = signalFilms[selectedSignalIndex] || films[currentFilmIndex % films.length];

  useEffect(() => {
    if (currentFilm) {
      const favorites = JSON.parse(localStorage.getItem('moodplay_favorites') || '[]');
      setIsFavorite(favorites.includes(currentFilm.id));
    }
  }, [currentFilm]);

  const toggleFavorite = () => {
    audioService.playEffect('ui_click', 0.4);
    if (!currentFilm) return;
    const favorites = JSON.parse(localStorage.getItem('moodplay_favorites') || '[]');
    const films = JSON.parse(localStorage.getItem('moodplay_films') || '[]');
    
    let newFavorites;
    let newFilms;
    
    if (favorites.includes(currentFilm.id)) {
      newFavorites = favorites.filter((id: number) => id !== currentFilm.id);
      newFilms = films.filter((f: Film) => f.id !== currentFilm.id);
      setIsFavorite(false);
    } else {
      newFavorites = [...favorites, currentFilm.id];
      newFilms = [...films, currentFilm];
      setIsFavorite(true);
    }
    
    localStorage.setItem('moodplay_favorites', JSON.stringify(newFavorites));
    localStorage.setItem('moodplay_films', JSON.stringify(newFilms));
  };

  const handleShare = async () => {
    audioService.playEffect('ui_click', 0.4);
    if (!currentFilm) return;
    const shareData = {
      title: 'MoodPlay Önerisi',
      text: `${currentFilm.title} (${currentFilm.year}). ${currentFilm.verdict}`,
      url: window.location.href
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (err) { console.error(err); }
    } else {
      alert(`Paylaşılıyor: ${currentFilm.title}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-transparent">
        <div className="relative">
          <motion.div
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-24 h-24 bg-oracle/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 m-auto w-2 h-2 bg-white rounded-full shadow-[0_0_15px_#FF6EB4]"
          />
        </div>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          className="mt-10 font-serif italic text-white/50 tracking-[0.2em] uppercase text-[10px]"
        >
          Sinyaller toplanıyor...
        </motion.p>
      </div>
    );
  }

  if (error === "TMDB_API_KEY is not configured") {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-transparent px-10 text-center">
        <OracleText text="Kâhin henüz tam olarak uyanmadı. TMDB API anahtarı eksik." className="mb-6" />
        <p className="text-white/40 text-xs font-manrope mb-12">
          Ayarlar &gt; Sırlar (Secrets) menüsünden TMDB_API_KEY değerini ekleyerek sinyalleri yakalayabilirsin.
        </p>
        <button onClick={onReset} className="text-oracle uppercase tracking-widest text-xs border border-oracle/20 px-6 py-2 rounded-full">Geri Dön</button>
      </div>
    );
  }

  if (error || films.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-transparent px-10 text-center">
        <OracleText text={error || "Bugün hiçbir sinyal alamıyorum. Belki de sessizlik gerekiyordur."} />
        <div className="mt-12 flex flex-col items-center gap-5">
          <button
            onClick={() => {
              audioService.playEffect('ui_click', 0.35);
              setRetryCount(count => count + 1);
            }}
            className="rounded-full border border-oracle/25 bg-oracle/5 px-6 py-3 text-oracle uppercase tracking-widest text-xs"
          >
            Sinyali tekrar ara
          </button>
          <button onClick={onReset} className="text-white/45 uppercase tracking-widest text-[10px]">Baştan Başla</button>
        </div>
      </div>
    );
  }

  const film = currentFilm;
  const signal = SIGNAL_LABELS[selectedSignalIndex] || SIGNAL_LABELS[0];
  const oracleReason = getOracleReason(film, mood, selectedSignalIndex);

  return (
    <div className="flex flex-col h-full w-full relative bg-transparent overflow-hidden">
      <motion.div 
        initial={{ y: '-100%' }}
        animate={{ y: 0 }}
        transition={{ duration: 1.2, ease: "linear" }}
        onAnimationComplete={() => setShowContent(true)}
        className="absolute inset-0 z-0"
      >
        <img 
          key={film.stillUrl}
          src={film.stillUrl} 
          className="w-full h-full object-cover opacity-35"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
      </motion.div>

      <AnimatePresence>
        {showContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="z-10 flex h-full w-full flex-col items-center justify-between px-8 pt-48 pb-8 text-center safe-area-bottom"
          >
            <div className="flex flex-col items-center gap-5 w-full">
              <div className="flex flex-col items-center gap-2">
                <span className="font-manrope text-[10px] uppercase tracking-[0.32em] text-oracle/80">
                  {signal.title}
                </span>
                <span className="font-serif italic text-white/45 text-sm">
                  {signal.subtitle}
                </span>
              </div>
              
              <div className="flex flex-col items-center">
                <motion.h1 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                  className="font-serif text-3xl text-white mb-2 drop-shadow-[0_0_8px_rgba(255,110,180,0.5)]"
                >
                  {film.title}
                </motion.h1>
                
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.55 }}
                  transition={{ delay: 1.5 }}
                  className="font-sans text-sm font-light uppercase tracking-widest"
                >
                  {film.year} · {film.director}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.7 }}
                  className="mt-7 grid w-full max-w-[330px] grid-cols-3 gap-2"
                >
                  {signalFilms.slice(0, 3).map((signalFilm, index) => (
                    <button
                      key={`${signalFilm.id}-${index}`}
                      onClick={() => {
                        audioService.playEffect('ui_click', 0.3);
                        setSelectedSignalIndex(index);
                      }}
                      className={`min-h-[76px] rounded-xl border px-2 py-3 text-left backdrop-blur-md transition-all ${
                        selectedSignalIndex === index
                          ? 'border-oracle/60 bg-oracle/12 shadow-[0_0_18px_rgba(255,110,180,0.16)]'
                          : 'border-white/10 bg-black/25'
                      }`}
                    >
                      <span className="block font-manrope text-[8px] uppercase tracking-[0.16em] text-oracle/70">
                        {SIGNAL_LABELS[index].title}
                      </span>
                      <span className="signal-card-title mt-2 block font-serif text-sm leading-tight text-white/80">
                        {signalFilm.title}
                      </span>
                    </button>
                  ))}
                </motion.div>

                {/* Quick Actions */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.9 }}
                  className="flex flex-row items-center gap-5 mt-7 p-1"
                >
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleFavorite}
                    className={`p-3 rounded-full flex items-center justify-center backdrop-blur-md border transition-all duration-500 ${isFavorite ? 'bg-oracle/20 border-oracle/50 scale-110' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                  >
                    <Heart size={18} className={isFavorite ? 'text-oracle fill-oracle' : 'text-white/40'} />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleShare}
                    className="p-3 rounded-full flex items-center justify-center bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-all"
                  >
                    <Share2 size={18} className="text-white/40" />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      audioService.playEffect('ui_click', 0.4);
                      onShowDetails(film);
                    }}
                    className="p-3 rounded-full flex items-center justify-center bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-all"
                  >
                    <Info size={18} className="text-white/40" />
                  </motion.button>
                </motion.div>
              </div>
            </div>

            <div className="mt-9 flex flex-col items-center gap-4 w-full max-w-[320px]">
              <button 
                onClick={() => {
                  audioService.playEffect('ui_click', 0.5);
                }}
                className="w-full font-serif text-oracle text-lg hover:scale-105 transition-all px-8 py-3 bg-oracle/5 border border-oracle/25 rounded-full backdrop-blur-md"
              >
                Bu gece bunu izleyeceğim
              </button>
              <button
                onClick={() => {
                  audioService.playEffect('ui_click', 0.35);
                  setShowSignalSecret(true);
                }}
                className="w-full rounded-full border border-oracle/20 bg-black/25 px-8 py-3 font-manrope text-[10px] uppercase tracking-[0.25em] text-oracle/80 backdrop-blur-md transition-all hover:bg-oracle/8 hover:text-oracle"
              >
                Sinyalin sırrı
              </button>
              <motion.button 
                animate={{ 
                  textShadow: [
                    "0 0 0px rgba(255,110,180,0)",
                    "0 0 10px rgba(255,110,180,0.5)",
                    "0 0 0px rgba(255,110,180,0)"
                  ],
                  scale: [1, 1.05, 1],
                  opacity: [0.35, 0.7, 0.35]
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                onClick={() => {
                  audioService.playEffect('ui_click', 0.4);
                  setCurrentFilmIndex(prev => prev + 3);
                  setSelectedSignalIndex(0);
                  setShowSignalSecret(false);
                  setShowContent(false);
                  setTimeout(() => setShowContent(true), 150);
                }}
                className="font-sans text-white/45 text-[10px] tracking-[0.3em] uppercase border-b border-white/10 pb-1"
              >
                Yeni üç sinyal göster
              </motion.button>
              <button
                onClick={() => {
                  audioService.playEffect('ui_click', 0.4);
                  onReset();
                }}
                className="mt-1 inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/8 px-5 py-3 text-[10px] font-sans uppercase tracking-[0.22em] text-white/70 backdrop-blur-md transition-all hover:bg-white/12 hover:text-white"
              >
                <Home size={14} strokeWidth={1.8} />
                Ana ekrana dön
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSignalSecret && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[140] flex items-center justify-center bg-black/72 px-8 backdrop-blur-md"
            onClick={() => setShowSignalSecret(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="relative w-full max-w-[330px] rounded-2xl border border-oracle/25 bg-black/80 px-6 py-7 text-left shadow-[0_0_45px_rgba(255,110,180,0.16)]"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                onClick={() => {
                  audioService.playEffect('ui_click', 0.25);
                  setShowSignalSecret(false);
                }}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/55"
              >
                ×
              </button>
              <p className="font-manrope text-[10px] uppercase tracking-[0.32em] text-oracle/80">
                Sinyalin sırrı
              </p>
              <h2 className="mt-3 pr-10 font-serif text-3xl leading-tight text-white">
                {film.title}
              </h2>
              <div className="my-6 h-[1px] w-full bg-gradient-to-r from-transparent via-oracle/45 to-transparent" />
              <p className="font-serif text-xl italic leading-relaxed text-white/80">
                {oracleReason}
              </p>
              <p className="mt-6 font-manrope text-[11px] uppercase tracking-[0.18em] text-white/35">
                Bu seçim; renk, ritim, kapı/ayna ve odadaki kişi bilgisiyle eşleşti.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('intro');
  const [mood, setMood] = useState<MoodData>({ valence: null, arousal: null, world: null, companion: null });
  const [history, setHistory] = useState<AppScreen[]>([]);
  const [direction, setDirection] = useState(1); // 1 for forward, -1 for backward
  const [selectedFilm, setSelectedFilm] = useState<Film | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  const toggleMute = () => {
    audioService.playEffect('ui_click', 0.3);
    const nextMute = !isAudioMuted;
    setIsAudioMuted(nextMute);
    audioService.setMuted(nextMute);
  };

  const navigate = useCallback((next: AppScreen) => {
    audioService.playEffect('ui_click', 0.4);
    audioService.playEffect('page_transition', 0.2);
    setDirection(1);
    setHistory(prev => [...prev, screen]);
    setScreen(next);
  }, [screen]);

  const goBack = useCallback(() => {
    audioService.playEffect('ui_click', 0.4);
    if (history.length === 0) return;
    audioService.playEffect('page_transition', 0.2);
    setDirection(-1);
    const prev = history[history.length - 1];
    setHistory(prevHistory => prevHistory.slice(0, -1));
    setScreen(prev);
  }, [history]);

  const goHome = useCallback(() => {
    audioService.playEffect('ui_click', 0.4);
    audioService.playEffect('page_transition', 0.2);
    setDirection(-1);
    setHistory([]);
    setScreen('intro');
  }, []);

  const getStepNumber = () => {
    switch(screen) {
      case 'color': return 1;
      case 'tempo': return 2;
      case 'world': return 3;
      case 'companion': return 4;
      case 'verdict': return 5;
      default: return 0;
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction > 0 ? '-100%' : '100%',
      opacity: 0
    })
  };

  return (
    <div className="relative w-[390px] h-[844px] bg-black overflow-hidden shadow-2xl border border-white/5 flex flex-col items-center">
      {!hasInteracted ? (
        <div className="absolute inset-0 z-[110] bg-black flex flex-col items-center justify-center px-6 text-center">
          <div className="intro-signal-lines">
            <div className="intro-signal-line top-[45%] rotate-[-3deg]" />
            <div className="intro-signal-line top-[73%] rotate-[5deg]" style={{ animationDelay: '-6s' }} />
          </div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            {/* The Logo from image */}
            <div className="relative w-48 h-48 mb-12 flex items-center justify-center">
              {/* Radar Circles */}
              <div className="absolute inset-0 border border-white/10 rounded-full" />
              <div className="absolute inset-4 border border-white/5 rounded-full" />
              
              {/* Target Lines */}
              <div className="absolute h-full w-[1px] bg-white/20 scale-y-[0.1] -translate-y-1/2 top-0" />
              <div className="absolute h-full w-[1px] bg-white/20 scale-y-[0.1] translate-y-1/2 bottom-0" />
              <div className="absolute w-full h-[1px] bg-white/20 scale-x-[0.1] -translate-x-1/2 left-0" />
              <div className="absolute w-full h-[1px] bg-white/20 scale-x-[0.1] translate-x-1/2 right-0" />

              {/* Eye shape from image */}
              <div className="relative w-20 h-10 border border-oracle/40 flex items-center justify-center rounded-[50%_50%]">
                <div className="absolute inset-0 border border-oracle/20 rounded-[50%_50%] scale-125" />
                <div className="w-5 h-5 bg-oracle rounded-full shadow-[0_0_25px_#FF6EB4]" />
              </div>

              {/* Rotating Sweep */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-t border-oracle/10 rounded-full"
              />
            </div>

            <h1 className="font-serif text-6xl text-white tracking-[0.2em] mb-4 drop-shadow-[0_0_15px_rgba(255,110,255,0.2)]">
              KÂHİN
            </h1>

            <p className="font-serif italic text-white/55 text-sm tracking-[0.22em] mb-12 drop-shadow-[0_0_12px_rgba(255,110,180,0.18)]">
              film keşfi · duygusal rehberlik · sinematik deneyim
            </p>

            <button 
              onClick={() => {
                audioService.playEffect('ui_click', 0.5);
                setHasInteracted(true);
                audioService.init();
                audioService.playAmbient();
              }}
              className="group relative"
            >
              <div className="absolute -inset-4 border border-oracle/20 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500 opacity-0 group-hover:opacity-100" />
              <span className="font-serif text-white/80 text-2xl tracking-[0.4em] hover:text-white transition-all duration-700">
                [ BAŞLA ]
              </span>
            </button>
          </motion.div>
        </div>
      ) : null}
      
      <div className="film-grain" />
      <OracleBackground />

      {screen === 'intro' && (
        <div className="fixed intro-audio-control z-[100]">
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: isAudioMuted ? 0.45 : 0.85 }}
            whileHover={{ opacity: 1 }}
            onClick={toggleMute}
            className="nav-icon-button text-white"
          >
            {isAudioMuted ? (
              <VolumeX size={22} strokeWidth={1.5} className="text-white/50" />
            ) : (
              <Volume2 size={22} strokeWidth={1.5} className="text-oracle drop-shadow-[0_0_8px_rgba(255,110,180,0.5)]" />
            )}
          </motion.button>
        </div>
      )}
      
      {screen !== 'intro' && screen !== 'pause' && (
        <Navigation 
          onBack={goBack} 
          onHome={goHome} 
          isMuted={isAudioMuted}
          onToggleMute={toggleMute}
          showBack={history.length > 0} 
        />
      )}
      
      <ProgressIndicator currentStep={getStepNumber()} />

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={screen}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.6, ease: "easeInOut" }
          }}
          className="w-full h-full flex flex-col items-center justify-center relative z-10"
        >
          {screen === 'intro' && (
            <IntroScreen 
              onNext={() => navigate('color')} 
              onCollection={() => navigate('collection')}
            />
          )}
          
          {screen === 'color' && (
            <ColorScreen onSelect={(v) => {
              setMood(prev => ({ ...prev, valence: v }));
              navigate('tempo');
            }} />
          )}

          {screen === 'tempo' && (
            <TempoScreen onSelect={(a) => {
              setMood(prev => ({ ...prev, arousal: a }));
              navigate('world');
            }} />
          )}

          {screen === 'world' && (
            <WorldScreen onSelect={(w) => {
              setMood(prev => ({ ...prev, world: w }));
              navigate('companion');
            }} />
          )}

          {screen === 'companion' && (
            <CompanionScreen onSelect={(c) => {
              setMood(prev => ({ ...prev, companion: c }));
              navigate('pause');
            }} />
          )}

          {screen === 'pause' && (
            <PauseScreen onComplete={() => navigate('verdict')} />
          )}

          {screen === 'verdict' && (
            <VerdictScreen 
              mood={mood} 
              onReset={goHome} 
              onShowDetails={(film) => {
                setSelectedFilm(film);
                navigate('details');
              }}
            />
          )}

          {screen === 'details' && selectedFilm && (
            <DetailsScreen 
              film={selectedFilm} 
              onBack={goBack} 
            />
          )}

          {screen === 'collection' && (
            <CollectionScreen 
              onBack={goHome}
              onShowDetails={(film) => {
                setSelectedFilm(film);
                navigate('details');
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
