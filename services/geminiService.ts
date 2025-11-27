import { GoogleGenAI } from "@google/genai";
import { TranslationMode } from "../types";

const GEMINI_API_KEY = process.env.API_KEY || '';

// Helper to convert Blob/File to Base64
const fileToGenerativePart = async (file: Blob) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // remove data:audio/xxx;base64, prefix
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.readAsDataURL(file);
  });
  
  return {
    inlineData: {
      data: await base64EncodedDataPromise,
      mimeType: file.type || 'audio/mp3',
    },
  };
};

export const generateSubtitles = async (
  audioFile: Blob, 
  mode: TranslationMode
): Promise<string> => {
  if (!GEMINI_API_KEY) {
    throw new Error("未检测到 API Key。请检查您的环境配置。");
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const audioPart = await fileToGenerativePart(audioFile);

  // System instruction to set the persona
  const systemInstruction = "你是一位专业的视频字幕编辑器和翻译专家。";
  
  // Base prompt requirements
  const commonRequirements = `
    任务:
    1. 仔细聆听音频内容。
    2. 生成符合标准 SubRip (.srt) 格式的字幕。
    3. 确保时间轴极其精准 (格式: HH:MM:SS,mmm)。
    4. **绝对不要**包含任何 Markdown 代码块格式（例如不要写 \`\`\`srt 或 \`\`\`）。直接输出纯文本内容。
    5. **绝对不要**在 SRT 内容前后添加任何闲聊、解释或前言。
    6. 根据语音停顿自然换行。
  `;

  let specificInstruction = "";

  switch (mode) {
    case TranslationMode.TRANSCRIPT_ONLY:
      specificInstruction = `7. 逐字逐句转录音频中的原始内容，不要进行翻译。`;
      break;
    case TranslationMode.TO_ENGLISH:
      specificInstruction = `7. 将语音内容翻译成自然、高质量的英文（English）字幕。`;
      break;
    case TranslationMode.TO_CHINESE:
      specificInstruction = `7. 将语音内容翻译成自然、流畅的简体中文字幕。`;
      break;
    case TranslationMode.BILINGUAL_CN_EN:
      specificInstruction = `7. 提供双语字幕。
      格式要求:
      第一行：简体中文
      第二行：English
      
      示例:
      1
      00:00:01,000 --> 00:00:04,000
      你好，很高兴见到你。
      Hello, nice to meet you.
      `;
      break;
  }

  const promptText = `${commonRequirements}\n${specificInstruction}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [audioPart, { text: promptText }]
      },
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3, // Lower temperature for accuracy
      }
    });

    const text = response.text;
    if (!text) throw new Error("Gemini 未返回任何内容。");
    
    // Cleanup strict: remove markdown fences if the model hallucinates them
    let cleanText = text.replace(/```srt/gi, '').replace(/```/g, '').trim();
    
    // Basic validation to check if it looks like SRT (starts with a number)
    if (!/^\d+/.test(cleanText)) {
       console.warn("输出内容可能不是标准的 SRT 格式，尝试自动修复...");
       // Find the first index of a number followed by a newline or timestamp structure
       const match = cleanText.match(/\d+\s*\n\d{2}:\d{2}:\d{2}/);
       if (match && match.index !== undefined) {
         cleanText = cleanText.substring(match.index);
       }
    }

    return cleanText;

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    let errorMsg = "处理音频时发生未知错误。";
    
    if (error.message.includes("API key")) {
      errorMsg = "API Key 无效或未配置。";
    } else if (error.message.includes("SAFETY")) {
      errorMsg = "由于安全策略，内容被拦截。";
    } else if (error.message.includes("429")) {
      errorMsg = "请求过多，请稍后再试 (Quota Exceeded)。";
    } else {
        errorMsg = error.message;
    }
    
    throw new Error(errorMsg);
  }
};