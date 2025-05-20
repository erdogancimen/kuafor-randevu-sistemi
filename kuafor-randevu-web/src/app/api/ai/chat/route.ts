import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { message, image } = await req.json();

    // Eğer resim varsa, resmi analiz et
    if (image) {
      const response = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Bu kişiye uygun saç modeli önerileri yap. Yüz şekli, ten rengi ve genel görünümüne göre en uygun 3 saç modeli öner. Her öneri için detaylı açıklama yap." },
              {
                type: "image_url",
                image_url: {
                  url: image,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      });

      return NextResponse.json({ response: response.choices[0].message.content });
    }

    // Sadece metin mesajı varsa
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Sen bir kuaför ve güzellik uzmanısın. Saç bakımı, cilt bakımı ve kişisel hijyen konularında uzman tavsiyeleri veriyorsun. Cevapların kısa, öz ve bilgilendirici olmalı."
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 500,
    });

    return NextResponse.json({ response: response.choices[0].message.content });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
} 