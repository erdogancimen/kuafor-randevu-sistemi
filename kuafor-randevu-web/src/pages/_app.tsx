import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/firebase/serviceWorker';
import { AppProps } from 'next/app';
import { Toaster } from 'react-hot-toast';

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Service worker'ı kaydet
    registerServiceWorker().catch(console.error);
  }, []);

  return (
    <>
      <Component {...pageProps} />
      <Toaster position="top-right" />
    </>
  );
}

export default MyApp; 