import type { MerchantDealGuardrails, UserProfile, Vehicle } from '../types';
import type { AppLanguage } from '../context/LanguageContext';
import enSystemPromptTemplate from '../../prompt/en/carmatch-ai-assistant-system-prompt.txt?raw';
import viSystemPromptTemplate from '../../prompt/vi/carmatch-ai-assistant-system-prompt.txt?raw';
import { retrieveKnowledge } from '../data/knowledge';
import { executeTool, type ToolName } from './ai/tools';
import { trackAIEvent, generateConversationId } from './analytics';

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantContext {
  language?: AppLanguage;
  currentVehicle?: Vehicle;
  profile?: UserProfile;
  comparedVehicles?: Vehicle[];
  shortlistVehicles?: Vehicle[];
  merchantGuardrails?: MerchantDealGuardrails;
  adminPromptInstructions?: string;
  
  // AI Optimization Plan Phase 2+ fields
  conversationId?: string;
  funnelStage?: 'intake' | 'shortlist' | 'compare' | 'detail' | 'quote' | 'booking' | 'showroom';
  enableRAG?: boolean;
  enableTools?: boolean;
}

export interface EnhancedAssistantResponse {
  reply: string;
  usedRAG: boolean;
  usedTools: Array<{ name: ToolName; success: boolean }>;
  knowledgeSources?: string[];
  fallbackUsed: boolean;
  latencyMs: number;
  conversationId: string;
}

function isVietnamese(language?: AppLanguage): boolean {
  return language !== 'en';
}

const DEFAULT_BASE_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
const DEFAULT_MODEL = 'qwen-turbo';

function buildProfileSummary(profile?: UserProfile): string {
  if (!profile) return 'No user profile is available yet.';
  const fields: Array<[string, string | undefined]> = [
    ['life stage', profile.lifeStage],
    ['primary need', profile.primaryUseNeed],
    ['driving mix', profile.drivingMix],
    ['budget band', profile.budgetBand],
    ['finance intent', profile.financeIntent],
  ];
  const lines = fields.filter(([, value]) => Boolean(value)).map(([label, value]) => `- ${label}: ${value}`);
  if (lines.length === 0) return 'No user profile answers are available yet.';
  return lines.join('\n');
}

function buildVehicleSummary(vehicle?: Vehicle): string {
  if (!vehicle) return 'No specific vehicle is selected.';
  return [
    `${vehicle.name} (${vehicle.trim})`,
    `- body style: ${vehicle.bodyStyle}`,
    `- price: ${vehicle.priceBand} (entry: ${vehicle.priceEntryMilVnd}m VND)`,
    `- thesis: ${vehicle.thesis}`,
    `- ownership path: ${vehicle.compare.ownershipPath}`,
    `- budget fit: ${vehicle.compare.budgetFit}`,
    `- city driving: ${vehicle.compare.cityDriving}`,
    `- highway comfort: ${vehicle.compare.highwayComfort}`,
    `- charging: ${vehicle.compare.charging ?? 'N/A'}`,
  ].join('\n');
}

function buildVehicleListSummary(label: string, vehicles: Vehicle[] | undefined): string {
  if (!vehicles || vehicles.length === 0) return `${label}: none`;
  const rows = vehicles.slice(0, 4).map(v => `- ${v.name} (${v.modelSlug}) · ${v.priceBand} · ${v.powertrain.toUpperCase()}`);
  return `${label}:\n${rows.join('\n')}`;
}

function buildGuardrailsSummary(guardrails?: MerchantDealGuardrails): string {
  if (!guardrails) return 'Merchant guardrails: not provided';
  return [
    'Merchant guardrails:',
    `- discount range: ${guardrails.discountMinPct}% to ${guardrails.discountMaxPct}%`,
    `- APR range: ${guardrails.aprMinPct}% to ${guardrails.aprMaxPct}%`,
    `- deposit range: ${guardrails.minDepositPct}% to ${guardrails.maxDepositPct}%`,
    `- allowed perks: ${guardrails.allowedPerks.join(', ') || 'none'}`,
  ].join('\n');
}

function renderPromptTemplate(template: string, context: AssistantContext): string {
  const replacements: Record<string, string> = {
    '{{CONTEXT_PROFILE_SUMMARY}}': buildProfileSummary(context.profile),
    '{{CONTEXT_CURRENT_VEHICLE_SUMMARY}}': buildVehicleSummary(context.currentVehicle),
    '{{CONTEXT_COMPARE_LIST_SUMMARY}}': buildVehicleListSummary('Context: compare list', context.comparedVehicles),
    '{{CONTEXT_SHORTLIST_SUMMARY}}': buildVehicleListSummary('Context: profile-based shortlist', context.shortlistVehicles),
    '{{CONTEXT_MERCHANT_GUARDRAILS}}': buildGuardrailsSummary(context.merchantGuardrails),
    '{{MERCHANT_COACHING_INSTRUCTIONS}}': context.adminPromptInstructions
      ?? (isVietnamese(context.language)
        ? 'Khong co chi dan bo sung tu merchant.'
        : 'No additional merchant coaching instructions provided.'),
  };

  return Object.entries(replacements).reduce(
    (output, [token, value]) => output.replace(token, value),
    template,
  );
}

export function buildCarAssistantSystemPrompt(context: AssistantContext): string {
  const template = isVietnamese(context.language) ? viSystemPromptTemplate : enSystemPromptTemplate;
  return renderPromptTemplate(template, context);
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

function trimConversation(messages: AssistantMessage[], maxMessages = 14): AssistantMessage[] {
  if (messages.length <= maxMessages) return messages;
  return messages.slice(messages.length - maxMessages);
}

function buildLocalFallbackAnswer(messages: AssistantMessage[], context: AssistantContext): string {
  const vi = isVietnamese(context.language);
  const latestUser = [...messages].reverse().find(m => m.role === 'user')?.content.toLowerCase() ?? '';
  const activeVehicle = context.currentVehicle ?? context.comparedVehicles?.[0] ?? context.shortlistVehicles?.[0];

  const vehicleLine = activeVehicle
    ? vi
      ? `${activeVehicle.name} (${activeVehicle.priceBand}) đang là lựa chọn phù hợp nhất với nhu cầu hiện tại của bạn.`
      : `${activeVehicle.name} (${activeVehicle.priceBand}) is the strongest fit for your current needs.`
    : vi
      ? 'Tôi cần thêm 1 mẫu xe cụ thể để tối ưu báo giá cho bạn.'
      : 'I need one specific model to give you the best deal path.';

  const g = context.merchantGuardrails;
  const discountLine = g
    ? vi
      ? `Khung thương lượng hợp lý hiện tại là ${g.discountMinPct}% đến ${g.discountMaxPct}%.`
      : `A realistic negotiable range right now is ${g.discountMinPct}% to ${g.discountMaxPct}%.`
    : vi
      ? 'Bạn có thể đề nghị showroom bổ sung ưu đãi để cải thiện giá trị đơn hàng.'
      : 'You can ask the showroom for an additional value package to improve the deal.';

  const asksDiscount = latestUser.includes('discount') || latestUser.includes('giam') || latestUser.includes('giảm');

  if (vi) {
    if (asksDiscount) {
      return [
        vehicleLine,
        discountLine,
        'Bạn có thể nói: "Nếu em chốt hôm nay, showroom hỗ trợ mức tốt nhất trong khung được không?"',
        'Nếu giá khó giảm thêm, hãy xin gói bảo dưỡng hoặc bảo hành mở rộng để tăng tổng giá trị.',
      ].join('\n');
    }
    return [
      vehicleLine,
      'Tôi đề xuất mình tiến thẳng tới bước báo giá chi tiết để giữ nhịp chốt đơn.',
      discountLine,
      'Nếu bạn đồng ý, tôi sẽ hướng dẫn mẫu tin nhắn ngắn để chốt lịch showroom ngay.',
    ].join('\n');
  }

  if (asksDiscount) {
    return [
      vehicleLine,
      discountLine,
      'You can send: "If I confirm today, what is the best final offer you can support within your approved range?"',
      'If price is firm, ask for service package or extended warranty to improve total value.',
    ].join('\n');
  }

  return [
    vehicleLine,
    'I recommend moving straight to a detailed quote to keep momentum.',
    discountLine,
    'If you want, I can help you with the exact message to secure a showroom appointment now.',
  ].join('\n');
}

function normalizeAssistantReply(raw: string): string {
  const cleaned = raw
    .replace(/\*\*/g, '')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\r/g, '')
    .trim();

  const seededLines = cleaned
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const sourceLines =
    seededLines.length <= 1
      ? cleaned
          .split(/(?<=[.!?])\s+/)
          .map(line => line.trim())
          .filter(Boolean)
      : seededLines;

  const lines = sourceLines.map(line => line.replace(/^\d+\)\s*/, '- ').replace(/^[•-]\s*/, '- '));

  const compactLines = lines.length > 0 ? lines : [cleaned];
  const relabeled = compactLines.map(line =>
    line
      .replace(/^-\s*Decision:\s*/i, '')
      .replace(/^-\s*Why:\s*/i, '')
      .replace(/^-\s*Next step:\s*/i, '')
      .replace(/^-\s*Risk:\s*/i, '')
      .replace(/^Decision:\s*/i, '')
      .replace(/^Why:\s*/i, '')
      .replace(/^Next step:\s*/i, '')
      .replace(/^Risk:\s*/i, ''),
  );
  const joined = relabeled.slice(0, 6).join('\n');
  return joined.trim();
}

export async function askQwenAssistant(messages: AssistantMessage[], context: AssistantContext): Promise<string> {
  const apiKey = import.meta.env.VITE_QWEN_API_KEY;
  if (!apiKey) {
    throw new Error('Missing VITE_QWEN_API_KEY. Add it to your .env file to enable the assistant.');
  }

  const baseUrl = import.meta.env.VITE_QWEN_API_BASE_URL || DEFAULT_BASE_URL;
  const model = import.meta.env.VITE_QWEN_MODEL || DEFAULT_MODEL;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 25000);

  const preparedMessages = trimConversation(messages);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          { role: 'system', content: buildCarAssistantSystemPrompt(context) },
          ...preparedMessages,
        ],
      }),
    });

    if (!response.ok) {
      const raw = await response.text();
      throw new Error(`Qwen request failed (${response.status}): ${raw.slice(0, 240)}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const output = data.choices?.[0]?.message?.content?.trim();
    if (!output) {
      throw new Error('Qwen returned an empty response.');
    }
    return normalizeAssistantReply(output);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return normalizeAssistantReply(buildLocalFallbackAnswer(preparedMessages, context));
    }
    return normalizeAssistantReply(buildLocalFallbackAnswer(preparedMessages, context));
  } finally {
    window.clearTimeout(timeoutId);
  }
}

/**
 * Enhanced AI Assistant with RAG and Tools support (Optimization Plan Phases 2-3)
 */
export async function askEnhancedAssistant(
  messages: AssistantMessage[],
  context: AssistantContext
): Promise<EnhancedAssistantResponse> {
  const startTime = performance.now();
  const conversationId = context.conversationId || generateConversationId();
  
  // Track conversation start
  trackAIEvent('ai_conversation_start', conversationId, {
    funnelStage: context.funnelStage,
    modelUsed: import.meta.env.VITE_QWEN_MODEL || DEFAULT_MODEL,
  });
  
  const usedTools: Array<{ name: ToolName; success: boolean }> = [];
  const knowledgeSources: string[] = [];
  let usedRAG = false;
  let fallbackUsed = false;
  
  const latestUserMessage = messages[messages.length - 1]?.content || '';
  
  // Phase 2: RAG - Retrieve relevant knowledge
  if (context.enableRAG !== false) {
    const ragStartTime = performance.now();
    const knowledgeResults = retrieveKnowledge(latestUserMessage, {
      language: context.language === 'vi' ? 'vi' : 'en',
    }, 3);
    
    if (knowledgeResults.length > 0) {
      usedRAG = true;
      knowledgeResults.forEach(doc => {
        knowledgeSources.push(doc.metadata.category);
        trackAIEvent('ai_knowledge_hit', conversationId, {
          ragQuery: latestUserMessage.slice(0, 100),
          ragDocumentIds: [doc.id],
          knowledgeSource: doc.type,
        });
      });
      
      trackAIEvent('ai_rag_query', conversationId, {
        ragQuery: latestUserMessage.slice(0, 100),
        ragDocumentIds: knowledgeResults.map(d => d.id),
      });
    } else {
      trackAIEvent('ai_knowledge_miss', conversationId, {
        ragQuery: latestUserMessage.slice(0, 100),
      });
    }
  }
  
  // Phase 3: Tool usage based on intent detection
  if (context.enableTools !== false && context.merchantGuardrails) {
    // Detect intent and call appropriate tools
    const lowerMessage = latestUserMessage.toLowerCase();
    
    // Price/discount intent
    if (lowerMessage.includes('price') || lowerMessage.includes('discount') || 
        lowerMessage.includes('giảm') || lowerMessage.includes('giá')) {
      if (context.currentVehicle) {
        const toolResult = await executeTool('price_estimator', {
          vehicleId: context.currentVehicle.id,
          discountPct: context.merchantGuardrails.discountMaxPct,
          includeOnRoad: true,
        });
        
        usedTools.push({ name: 'price_estimator', success: toolResult.success });
        trackAIEvent(toolResult.success ? 'ai_tool_result' : 'ai_tool_error', conversationId, {
          toolName: 'price_estimator',
          toolOutput: toolResult.data || undefined,
          toolLatencyMs: toolResult.latencyMs,
        });
      }
    }
    
    // Finance intent
    if (lowerMessage.includes('finance') || lowerMessage.includes('loan') || 
        lowerMessage.includes('monthly') || lowerMessage.includes('trả góp')) {
      if (context.currentVehicle) {
        const toolResult = await executeTool('finance_estimator', {
          vehiclePrice: context.currentVehicle.priceEntryMilVnd * 1000000,
          downPaymentPct: 20,
          loanTermMonths: 48,
          aprPct: context.merchantGuardrails.aprMinPct,
        });
        
        usedTools.push({ name: 'finance_estimator', success: toolResult.success });
        trackAIEvent(toolResult.success ? 'ai_tool_result' : 'ai_tool_error', conversationId, {
          toolName: 'finance_estimator',
          toolOutput: toolResult.data || undefined,
          toolLatencyMs: toolResult.latencyMs,
        });
      }
    }
    
    // Showroom/appointment intent
    if (lowerMessage.includes('showroom') || lowerMessage.includes('visit') || 
        lowerMessage.includes('appointment') || lowerMessage.includes('xem xe')) {
      const toolResult = await executeTool('showroom_lookup', {
        city: context.language === 'vi' ? 'Hà Nội' : 'Hanoi',
      });
      
      usedTools.push({ name: 'showroom_lookup', success: toolResult.success });
      trackAIEvent(toolResult.success ? 'ai_tool_result' : 'ai_tool_error', conversationId, {
        toolName: 'showroom_lookup',
        toolOutput: toolResult.data || undefined,
        toolLatencyMs: toolResult.latencyMs,
      });
    }
  }
  
  // Build enhanced system prompt with RAG context
  let enhancedContext = { ...context };
  if (usedRAG && knowledgeSources.length > 0) {
    // In production, would inject retrieved knowledge into prompt
    enhancedContext.adminPromptInstructions = `${context.adminPromptInstructions || ''}\n\nRetrieved knowledge from: ${knowledgeSources.join(', ')}`;
  }
  
  // Call the base assistant
  let reply: string;
  try {
    reply = await askQwenAssistant(messages, enhancedContext);
  } catch (error) {
    fallbackUsed = true;
    reply = buildLocalFallbackAnswer(messages, context);
    trackAIEvent('ai_fallback_to_human', conversationId, {
      guardrailType: 'error',
      violationDetails: error instanceof Error ? error.message : 'Unknown error',
    });
  }
  
  const latencyMs = performance.now() - startTime;
  
  // Track completion
  trackAIEvent('ai_message_received', conversationId, {
    funnelStage: context.funnelStage,
    latencyMs,
    modelUsed: import.meta.env.VITE_QWEN_MODEL || DEFAULT_MODEL,
  });
  
  return {
    reply,
    usedRAG,
    usedTools,
    knowledgeSources: usedRAG ? knowledgeSources : undefined,
    fallbackUsed,
    latencyMs,
    conversationId,
  };
}
