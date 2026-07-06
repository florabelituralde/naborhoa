import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, Users, ClipboardList, CreditCard } from "lucide-react";
import NaborLogo from "@/components/NaborLogo";

const VIDEO_URL =
  "https://media.base44.com/videos/public/6a4acea33cfa263e6d1847b3/2400dfc94_Neighborhood_Video.mp4";

const SLIDES = [
  {
    image:
      "https://media.base44.com/images/public/6a4acea33cfa263e6d1847b3/82cc177f5_generated_image.png",
    icon: Users,
    title: "One place for your whole neighborhood",
    text: "Announcements, events, board updates and community docs — everyone stays in the loop.",
  },
  {
    image:
      "https://media.base44.com/images/public/6a4acea33cfa263e6d1847b3/d67c7bd51_generated_image.png",
    icon: ClipboardList,
    title: "Submit & track requests in seconds",
    text: "Report maintenance issues and watch them move from submitted to resolved.",
  },
  {
    image:
      "https://media.base44.com/images/public/6a4acea33cfa263e6d1847b3/1e2c72b66_generated_image.png",
    icon: CreditCard,
    title: "Pay dues without the paperwork",
    text: "View invoices and pay HOA dues online — no checks, no hassle.",
  },
];

// Full-screen intro shown above the auth form. The user swipes/slides up
// (or taps the button) to reveal the login/register form beneath it.
export default function IntroPreview({ onDismiss }) {
  const [slide, setSlide] = useState(0);
  const startY = useRef(null);

  // Auto-advance the feature slides
  useEffect(() => {
    const id = setInterval(() => {
      setSlide((s) => (s + 1) % SLIDES.length);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  const handleTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e) => {
    if (startY.current == null) return;
    const delta = startY.current - e.changedTouches[0].clientY;
    if (delta > 60) onDismiss();
    startY.current = null;
  };

  return (
    <motion.div
      initial={{ y: 0 }}
      exit={{ y: "-100%" }}
      transition={{ type: "tween", duration: 0.5, ease: "easeInOut" }}
      className="fixed inset-0 z-40 bg-background flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={(e) => {
        if (e.deltaY > 30) onDismiss();
      }}
    >
      {/* Video hero */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src={VIDEO_URL}
          poster={SLIDES[0].image}
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-black/50 to-black/50" />
        <div className="relative h-full flex flex-col items-center justify-center text-center px-6">
          <NaborLogo iconClassName="w-16 h-16" textClassName="font-bold text-3xl text-white drop-shadow-lg" />
          <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.6)] max-w-lg">
            Bringing your neighborhood together
          </h1>
          <p className="mt-2 text-white/95 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)] max-w-md">
            The all-in-one home for your community — connected, organized, and effortless.
          </p>
        </div>
      </div>

      {/* Feature slides */}
      <div className="bg-card border-t border-border px-6 pt-6 pb-4">
        <div className="max-w-md mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-4"
            >
              <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 border border-border">
                <img src={SLIDES[slide].image} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {React.createElement(SLIDES[slide].icon, {
                    className: "w-4 h-4 text-primary",
                  })}
                  <h3 className="font-semibold text-foreground">{SLIDES[slide].title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{SLIDES[slide].text}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-4">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-2 rounded-full transition-all ${
                  i === slide ? "w-6 bg-primary" : "w-2 bg-border"
                }`}
              />
            ))}
          </div>

          {/* Reveal form */}
          <button
            onClick={onDismiss}
            className="mt-5 w-full flex flex-col items-center gap-1 text-primary font-medium py-2 group"
          >
            <motion.span
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
            >
              <ChevronUp className="w-6 h-6" />
            </motion.span>
            <span className="text-sm">Swipe up to get started</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}