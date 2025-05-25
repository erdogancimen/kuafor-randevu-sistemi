import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// API anahtarının varlığını kontrol et
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not defined in environment variables');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { message, image } = await req.json();

    // API anahtarının varlığını kontrol et
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is missing');
      return NextResponse.json(
        { error: 'API anahtarı yapılandırılmamış' },
        { status: 500 }
      );
    }

    // API anahtarının formatını kontrol et
    if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
      console.error('Invalid API key format');
      return NextResponse.json(
        { error: 'Geçersiz API anahtarı formatı' },
        { status: 500 }
      );
    }

    let prompt = message;
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: "Sen bir kuaför ve güzellik uzmanısın. Kullanıcılara saç stilleri, kişisel bakım ve cilt bakımı konularında yardımcı oluyorsun. Yanıtlarını Türkçe olarak ver."
      }
    ];

    if (image) {
      prompt = `Bu resimdeki kişi için saç stili ve bakım önerileri: ${message}`;
      messages.push({
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: image } }
        ]
      });
    } else {
      messages.push({
        role: "user",
        content: prompt
      });
    }

    console.log('Sending request to OpenAI with prompt:', prompt);

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages,
        max_tokens: 500,
      });

      console.log('Received response from OpenAI');

      return NextResponse.json({
        response: completion.choices[0].message.content
      });
    } catch (apiError: any) {
      console.error('OpenAI API Error Details:', {
        status: apiError.status,
        message: apiError.message,
        type: apiError.type,
        code: apiError.code
      });

      // API hata kodlarına göre özel mesajlar
      let errorMessage = 'AI asistanına erişirken bir hata oluştu';
      
      if (apiError.status === 401) {
        errorMessage = 'API anahtarı geçersiz veya süresi dolmuş';
      } else if (apiError.status === 429) {
        errorMessage = 'API kullanım limiti aşıldı';
      } else if (apiError.status === 402) {
        errorMessage = 'Yetersiz bakiye. Lütfen OpenAI hesabınıza kredi ekleyin';
      }

      return NextResponse.json(
        { 
          error: errorMessage,
          details: apiError.message || 'Bilinmeyen hata',
          code: apiError.code,
          type: apiError.type
        },
        { status: apiError.status || 500 }
      );
    }
  } catch (error: any) {
    console.error('General Error:', error);
    
    return NextResponse.json(
      { 
        error: 'İstek işlenirken bir hata oluştu',
        details: error.message || 'Bilinmeyen hata'
      },
      { status: 500 }
    );
  }
} 