export enum AppSection {
  DASHBOARD = 'DASHBOARD',
  KNOWLEDGE_BASE = 'KNOWLEDGE_BASE',
  CHAT_AUDIT = 'CHAT_AUDIT',
  SMART_DRAFTER = 'SMART_DRAFTER'
}

export interface KnowledgeItem {
  id: string;
  app: string;
  category: string;
  question: string;
  alternativeQuestions?: string[]; // New field for similar user queries
  answer: string;
  optimizedAnswer?: string;
  frequency: string; 
  lastUpdated: string;
}

export interface ChatAuditResult {
  id: string;
  userIssue: string;
  agentResponseOriginal: string;
  score: number; // 1-10
  critique: string;
  improvedResponse: string;
  sentiment: string;
  timestamp: string;
}

// For Gemini JSON Schemas
export interface ExtractedKnowledgeResponse {
  items: Array<{
    app: string;
    category: string;
    question: string;
    alternativeQuestions: string[];
    answer: string;
    optimizedAnswer: string;
    frequency: string;
  }>;
}

export interface AuditResponse {
  userIssue: string;
  agentResponse: string;
  score: number;
  critique: string;
  improvedResponse: string;
  sentiment: string;
}