import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll direct naar boven (0, 0) als de pathname verandert
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}