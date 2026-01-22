import { useLocation, useOutlet } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/page-transition";

export function AnimatedOutlet() {
  const location = useLocation();
  const outlet = useOutlet();

  return (
    <AnimatePresence mode="wait">
      <PageTransition key={location.pathname}>
        {outlet}
      </PageTransition>
    </AnimatePresence>
  );
}