import React from "react";
import { motion } from "framer-motion";

// Subtle slide + fade transition applied to routed page content.
export default function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="min-h-full"
    >
      {children}
    </motion.div>
  );
}