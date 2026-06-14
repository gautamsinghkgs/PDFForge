import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const HEALTH_URL = 'https://pdfforge-server-8mwu.onrender.com/healthz';

export default function KeepAlive() {
  const { pathname } = useLocation();

  useEffect(() => {
    fetch(HEALTH_URL).catch(() => {});
  }, [pathname]);

  useEffect(() => {
    const id = setInterval(() => fetch(HEALTH_URL).catch(() => {}), 240000);
    return () => clearInterval(id);
  }, []);

  return null;
}
