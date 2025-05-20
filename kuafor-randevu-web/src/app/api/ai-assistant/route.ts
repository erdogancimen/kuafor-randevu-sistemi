import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { message, image } = await req.json();

    let prompt = message;
    if (image) {
      // Eğer resim varsa, resim analizi için prompt'u güncelle
      prompt = `Bu resimdeki kişi için saç stili ve bakım önerileri: ${message}`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "system",
          content: "Sen bir kuaför ve güzellik uzmanısın. Kullanıcılara saç stilleri, kişisel bakım ve cilt bakımı konularında yardımcı oluyorsun. Yanıtlarını Türkçe olarak ver."
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            ...(image ? [{ type: "image_url", image_url: image }] : [])
          ]
        }
      ],
      max_tokens: 500,
    });

    return NextResponse.json({
      response: completion.choices[0].message.content
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
} 