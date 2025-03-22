/// <reference types="react" />

declare module 'react-hot-toast' {
  export interface Toast {
    id: string;
    type: 'success' | 'error' | 'loading' | 'blank' | 'custom';
    message: string;
  }

  export interface ToasterProps {
    position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
    toastOptions?: any;
    reverseOrder?: boolean;
    gutter?: number;
    containerStyle?: React.CSSProperties;
    containerClassName?: string;
  }

  export const toast: {
    (message: string, options?: any): string;
    success(message: string, options?: any): string;
    error(message: string, options?: any): string;
    loading(message: string, options?: any): string;
    dismiss(toastId?: string): void;
  };

  export function Toaster(props: ToasterProps): JSX.Element;

  export default toast;
}