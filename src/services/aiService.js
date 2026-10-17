import { supabase } from '../supabase';

export const generateAiResponse = async (chatHistory, newPrompt) => {
  // Geçmişi formatla
  let historyText = "Sen BuddsApp uygulamasındaki yapay zeka kankası 'Budds AI'sın. Sen ortamın zeki, hafif laf sokan ama eğlenceli karakterisin. KURAL 1: KESİNLİKLE sadece kullanıcının göreceği nihai cevabı ver! İç düşüncelerini veya seçenekleri ASLA yazma. KURAL 2: Kullanıcı senden özellikle uzun bir şey (şarkı, şiir, makale vb.) istemediği sürece kısa ve net cevap ver. Eğer uzun bir şey isterse istediği uzunlukta yaz.\n\nSohbet Geçmişi:\n";
  
  if (chatHistory && chatHistory.length > 0) {
    chatHistory.slice(-15).forEach(msg => {
      if (msg.type === 'text') {
        const sender = "Kullanıcı";
        historyText += `${sender}: ${msg.content}\n`;
      } else if (msg.type === 'ai_bot') {
        historyText += `Sen (Budds AI): ${msg.content}\n`;
      }
    });
  }

  historyText += `\nYeni Soru/Mesaj: ${newPrompt}\nSen (Budds AI): `;

  try {
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        contents: [{ parts: [{ text: historyText }] }],
        generationConfig: { maxOutputTokens: 4000, temperature: 0.9 }
      }
    });

    if (error) {
      console.error("AI Service invoke error:", error);
      return "Bağlantı koptu veya servis yanıt vermedi, sonra tekrar dene.";
    }

    if (data?.error) {
      console.error("Gemini Error:", data.error);
      if (data.error.code === 429) return "Şu an çok fazla mesaj alıyorum, biraz yavaşla kanka (API kotası doldu).";
      if (data.error.code === 400) return "Bu soruyu cevaplamak istemiyorum (Geçersiz istek).";
      return `Beynim yandı, geçici bir hata oluştu. (Sistem Notu: ${data.error.message || data.error.code})`;
    }

    if (data?.candidates && data.candidates[0]?.content?.parts) {
      return data.candidates[0].content.parts[0].text.trim();
    } else if (data?.candidates && data.candidates[0]?.finishReason) {
      return `Buna cevap veremem kanka. (Sebep: ${data.candidates[0].finishReason})`;
    }
    
    return "Ne diyeceğimi bilemedim.";
  } catch (error) {
    console.error("AI Service Error:", error);
    return "Bağlantı koptu, sonra tekrar dene.";
  }
};
