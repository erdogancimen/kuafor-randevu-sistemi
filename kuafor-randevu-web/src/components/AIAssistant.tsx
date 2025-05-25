'use client';

import { useState, useRef } from 'react';
import { Send, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AIAssistant() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !image) return;

    try {
      setLoading(true);
      setResponse('');

      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, image }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Bir hata oluştu');
      }

      setResponse(data.response);
      setMessage('');
      setImage(null);
    } catch (error: any) {
      console.error('AI Assistant Error:', error);
      
      // Hata mesajını kullanıcıya göster
      if (error.message.includes('API anahtarı')) {
        toast.error('API anahtarı yapılandırması eksik. Lütfen yönetici ile iletişime geçin.');
      } else if (error.message.includes('bakiye')) {
        toast.error('Yetersiz bakiye. Lütfen daha sonra tekrar deneyin.');
      } else {
        toast.error(error.message || 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-gray-800 rounded-lg shadow-lg border border-white/10">
      <div className="p-4">
        <h3 className="text-lg font-semibold text-white mb-4">AI Asistan</h3>
        
        {response && (
          <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
            <p className="text-white text-sm">{response}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {image && (
            <div className="relative">
              <img
                src={image}
                alt="Uploaded"
                className="w-full h-32 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 p-1 bg-red-500 rounded-full hover:bg-red-600"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          )}

          <div className="flex space-x-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Saç stili veya bakım önerisi iste..."
              className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              ref={fileInputRef}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 cursor-pointer"
            >
              <ImageIcon className="w-5 h-5" />
            </label>
            <button
              type="submit"
              disabled={loading || (!message.trim() && !image)}
              className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 