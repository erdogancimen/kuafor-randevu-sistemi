'use client';

import { useState, useRef } from 'react';
import { Send, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
}

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !selectedImage) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      imageUrl: selectedImage || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      // TODO: API endpoint'e istek at
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          image: selectedImage
        }),
      });

      const data = await response.json();
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* AI Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 rounded-full bg-primary px-6 py-3 text-white shadow-lg hover:bg-primary/90 transition"
      >
        <span>Yapay Zekaya Sor</span>
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-full max-w-2xl h-[600px] bg-gray-900 rounded-xl shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">Yapay Zeka Asistanı</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-primary text-white'
                        : 'bg-gray-800 text-white'
                    }`}
                  >
                    {message.imageUrl && (
                      <div className="mb-2">
                        <Image
                          src={message.imageUrl}
                          alt="Uploaded"
                          width={200}
                          height={200}
                          className="rounded-lg"
                        />
                      </div>
                    )}
                    <p>{message.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-400 hover:text-white transition"
                >
                  <ImageIcon className="w-6 h-6" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Saç modeli, cilt bakımı veya kişisel hijyen hakkında soru sorun..."
                  className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={isLoading || (!input.trim() && !selectedImage)}
                  className="p-2 text-primary hover:text-primary/90 transition disabled:opacity-50"
                >
                  <Send className="w-6 h-6" />
                </button>
              </div>
              {selectedImage && (
                <div className="mt-2 relative inline-block">
                  <Image
                    src={selectedImage}
                    alt="Selected"
                    width={100}
                    height={100}
                    className="rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
} 