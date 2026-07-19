import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, Users, ClipboardList, CreditCard, Vote, Calendar, FileText, Bell } from "lucide-react";
import NaborLogo from "@/components/NaborLogo";

const VIDEO_URL =
  "/intro/neighborhood.mp4";

const SLIDES = [
  {
    image:
      "/intro/slide-1.png",
    icon: Users,
    title: "One place for your whole neighborhood",
    text: "Announcements, events, board updates and community docs — everyone stays in the loop.",
  },
  {
    image:
      "/intro/slide-2.png",
    icon: ClipboardList,
    title: "Submit & track any request",
    text: "Maintenance, repairs, and plan reviews with custom request types and real-time status updates.",
  },
  {
    image:
      "/intro/slide-3.png",
    icon: CreditCard,
    title: "Pay dues without the paperwork",
    text: "Pay HOA dues, assessments, and fees online with card or ACH — view invoices and history anytime.",
  },
  {
    image:
      "/intro/slide-1.png",
    icon: Vote,
    title: "Vote in elections & polls",
    text: "Meet the candidates, read their statements, and cast your ballot in board elections and community polls.",
  },
  {
    image:
      "/intro/slide-2.png",
    icon: Calendar,
    title: "Never miss an event",
    text: "Track meetings, social gatherings, and important deadlines on a shared community calendar.",
  },
  {
    image:
      "/intro/slide-3.png",
    icon: FileText,
    title: "Documents & financial transparency",
    text: "Access bylaws, rules, and meeting minutes, plus transparent budgets and expense tracking.",
  },
  {
    image:
      "/intro/slide-1.png",
    icon: Bell,
    title: "Stay in the loop",
    text: "Smart notifications for request updates, invoices, announcements, and voting reminders — so nothing slips by.",
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
            Your neighborhood, finally in sync
          </h1>
          <p className="mt-2 text-white/95 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)] max-w-md">
            Dues, requests, votes, and updates — all in one place. Join your HOA in under a minute.
          </p>
        </div>
      </div>

      {/* Feature slides */}
      <div className="bg-card border-t border-border px-6 pt-3 pb-4">
        <div className="max-w-md mx-auto">
          <div className="relative h-36 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 flex items-center gap-4"
              >
                <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  {React.createElement(SLIDES[slide].icon, {
                    className: "w-10 h-10 text-primary",
                  })}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground mb-1">{SLIDES[slide].title}</h3>
                  <p className="text-sm text-muted-foreground leading-snug">{SLIDES[slide].text}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

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