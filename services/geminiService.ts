import { GoogleGenAI, Type, Schema } from "@google/genai";
import { KnowledgeItem, ChatAuditResult } from "../types";

// Helper to get client
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  return new GoogleGenAI({ apiKey });
};

// 1. Knowledge Base Extraction
export const extractKnowledgeFromInput = async (
  textInput: string, 
  imageBase64?: string
): Promise<Omit<KnowledgeItem, 'id' | 'lastUpdated'>[]> => {
  const ai = getClient();
  
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            app: { type: Type.STRING, description: "App 名称，必须是指定列表中的一个" },
            category: { type: Type.STRING, description: "问题分类，例如：会员问题、使用问题" },
            question: { type: Type.STRING, description: "标准问题描述" },
            alternativeQuestions: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "用户可能询问该问题的其他不同说法 (3-5个)"
            },
            answer: { type: Type.STRING, description: "从原文中提取的原始回答" },
            optimizedAnswer: { type: Type.STRING, description: "基于原始回答优化后的专业、共情客服话术 (中文)" },
            frequency: { type: Type.STRING, description: "出现频率: 高, 中, 低" }
          },
          required: ["app", "category", "question", "alternativeQuestions", "answer", "optimizedAnswer", "frequency"]
        }
      }
    }
  };

  const parts: any[] = [];
  if (imageBase64) {
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: imageBase64
      }
    });
  }
  
  // Prompt instructions updated for specific App list and alternative questions
  const promptText = `
    分析提供的内容（文本或图片）。
    提取客户服务问答知识条目。
    **重要：如果这是一张包含多个问题的表格或列表图片，请务必提取所有可见的行/问题，不要遗漏。**
    
    对于每一条提取的内容：
    1. **识别 App 名称**：必须严格归类为以下列表之一：['辞书', 'Test', '阅读', 'Kana', '会话', 'Web', '活动', '通用']。如果不确定或不属于前述产品，请归类为 '通用'。
    2. **识别问题分类**：例如：会员问题、使用问题、功能建议、账号异常、支付问题等。
    3. **识别标准问题 (Question)**。
    4. **生成相似问法 (AlternativeQuestions)**：列出 3-5 个用户可能询问同一问题的不同说法（使用不同的关键词、口语化表达或从不同角度提问）。
    5. 提取原始的官方回复 (Answer)。
    6. **生成优化话术 (OptimizedAnswer)**：基于原始回复，编写一段更具同理心、专业且清晰的客服回复。
    7. 如果内容中提到了频率，请提取；如果没有，请根据问题严重性估算为：高、中、低。
    
    请直接输出中文内容。
    返回严格的 JSON 格式。
    ${textInput ? `上下文文本: ${textInput}` : ''}
  `;
  
  parts.push({ text: promptText });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 0.2 // Lower temp for factual extraction
    }
  });

  const parsed = JSON.parse(response.text || '{"items": []}');
  return parsed.items;
};

// 2. Chat Audit & Optimization
export const auditChatInteraction = async (
  imageBase64: string,
  contextText?: string
): Promise<Omit<ChatAuditResult, 'id' | 'timestamp'>> => {
  const ai = getClient();

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      userIssue: { type: Type.STRING, description: "用户的问题 (中文)" },
      agentResponseOriginal: { type: Type.STRING, description: "从图片转录的客服原始回复" },
      score: { type: Type.NUMBER, description: "质量评分 1-10" },
      critique: { type: Type.STRING, description: "评分理由及改进点 (中文)" },
      improvedResponse: { type: Type.STRING, description: "更具同理心且准确的优化话术 (中文)" },
      sentiment: { type: Type.STRING, description: "用户情绪: 满意, 平静, 不满, 愤怒" }
    },
    required: ["userIssue", "agentResponseOriginal", "score", "critique", "improvedResponse", "sentiment"]
  };

  const parts = [
    {
      inlineData: {
        mimeType: "image/jpeg",
        data: imageBase64
      }
    },
    {
      text: `分析这张聊天记录截图。
      1. 识别用户的具体问题。
      2. 转录客服的回复。
      3. 基于同理心、清晰度和解决方案准确性对回复进行打分 (1-10)。
      4. 用中文提供点评，指出不足之处。
      5. 提供一个更好的回复话术 (中文)。
      6. 判断用户情绪。
      ${contextText ? `额外上下文: ${contextText}` : ''}`
    }
  ];

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: schema
    }
  });

  return JSON.parse(response.text || '{}');
};

// 3. Smart Drafter
export const generateDraftResponse = async (
  keywords: string,
  tone: string = "Professional",
  corpus: string[] = []
): Promise<string> => {
  const ai = getClient();
  
  const corpusContext = corpus.length > 0 
    ? `\n必须遵守以下参考语料/业务规则:\n${corpus.map(c => `- ${c}`).join('\n')}`
    : '';

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `请编写一条客户服务回复（邮件或消息）。
    关键词/问题: ${keywords}
    语气要求: ${tone}
    ${corpusContext}
    
    通用生成规则:
    - 语言必须是中文。
    - 充满同理心。
    - 清晰简洁。
    - 如果是拒绝请求，请礼貌但坚定。
    - 如果提供了业务规则，请优先依据规则生成。
    - 落款为 '客服团队'，不要使用 [你的名字] 等占位符。
    `,
  });

  return response.text || "无法生成草稿。";
};