import { supabase } from '../supabase';

export const getGeminiKey = async () => {
  try {
    const { data } = await supabase.from('global_settings').select('text_value').eq('id', 'gemini_api_key').single();
    return data?.text_value || null;
  } catch (error) {
    return null;
  }
};

export const generateAiResponse = async (chatHistory, newPrompt) => {
  const apiKey = await getGeminiKey();
  if (!apiKey) {
    return "Sistemimde Gemini API anahtarı bulunamadı. Lütfen Admin panelinden anahtarı ekleyin.";
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

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
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: historyText }] }],
        generationConfig: { maxOutputTokens: 4000, temperature: 0.9 }
      })
    });

    const data = await response.json();
    if (data.error) {
      console.error("Gemini Error:", data.error);
      if (data.error.code === 429) return "Şu an çok fazla mesaj alıyorum, biraz yavaşla kanka (API kotası doldu).";
      if (data.error.code === 400) return "Bu soruyu cevaplamak istemiyorum (Geçersiz istek).";
      return `Beynim yandı, geçici bir hata oluştu. (Sistem Notu: ${data.error.message || data.error.code})`;
    }

    if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
      return data.candidates[0].content.parts[0].text.trim();
    } else if (data.candidates && data.candidates[0].finishReason) {
      return `Buna cevap veremem kanka. (Sebep: ${data.candidates[0].finishReason})`;
    }
    
    return "Ne diyeceğimi bilemedim.";
  } catch (error) {
    console.error("AI Service Error:", error);
    return "Bağlantı koptu, sonra tekrar dene.";
  }
};
