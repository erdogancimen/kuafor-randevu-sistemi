import { ReactNode } from 'react';

declare module 'react-hot-toast' {
  export type ToastPosition =
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right';

  export interface ToastOptions {
    duration?: number;
    style?: React.CSSProperties;
    className?: string;
    icon?: ReactNode;
    position?: ToastPosition;
    ariaProps?: {
      role: 'status' | 'alert';
      'aria-live': 'assertive' | 'off' | 'polite';
    };
  }

  export interface Toast {
    id: string;
    type: 'success' | 'error' | 'loading' | 'blank' | 'custom';
    message: string | ReactNode;
    icon?: ReactNode;
    duration?: number;
    pauseDuration: number;
    position?: ToastPosition;
  }

  export interface ToasterProps {
    position?: ToastPosition;
    toastOptions?: ToastOptions;
    reverseOrder?: boolean;
    gutter?: number;
    containerStyle?: React.CSSProperties;
    containerClassName?: string;
    children?: (toast: Toast) => ReactNode;
  }

  export const toast: {
    (message: string | ReactNode, opts?: ToastOptions): string;
    success: (message: string | ReactNode, opts?: ToastOptions) => string;
    error: (message: string | ReactNode, opts?: ToastOptions) => string;
    loading: (message: string | ReactNode, opts?: ToastOptions) => string;
    custom: (message: string | ReactNode, opts?: ToastOptions) => string;
    dismiss: (toastId?: string) => void;
    remove: (toastId?: string) => void;
    promise: <T>(
      promise: Promise<T>,
      msgs: {
        loading: string | ReactNode;
        success: string | ReactNode | ((data: T) => string | ReactNode);
        error: string | ReactNode | ((err: any) => string | ReactNode);
      },
      opts?: ToastOptions
    ) => Promise<T>;
  };

  export function Toaster(props: ToasterProps): JSX.Element;
  export default toast;
} 