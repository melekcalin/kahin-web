import { useState, useEffect, useRef } from 'react';

export const useTypewriter = (text: string = '', speed: number = 40, startDelay: number = 0, onComplete?: () => void) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const textRef = useRef(text);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    textRef.current = text;
    onCompleteRef.current = onComplete;
  }, [text, onComplete]);

  useEffect(() => {
    if (!text) {
      setDisplayedText('');
      setIsComplete(true);
      onCompleteRef.current?.();
      return;
    }

    setDisplayedText('');
    setIsComplete(false);
    
    let timeoutId: ReturnType<typeof setTimeout>;
    let currentIndex = 0;

    const startTyping = () => {
      const intervalId = setInterval(() => {
        if (currentIndex < textRef.current.length) {
          const char = textRef.current.charAt(currentIndex);
          setDisplayedText((prev) => prev + char);
          currentIndex++;
        } else {
          clearInterval(intervalId);
          setIsComplete(true);
          onCompleteRef.current?.();
        }
      }, speed);
      return intervalId;
    };

    let typingInterval: ReturnType<typeof setInterval>;
    timeoutId = setTimeout(() => {
      typingInterval = startTyping();
    }, startDelay);

    return () => {
      clearTimeout(timeoutId);
      if (typingInterval) clearInterval(typingInterval);
    };
  }, [text, speed, startDelay]);

  return { displayedText, isComplete };
};
