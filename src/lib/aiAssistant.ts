import type { MerchantDealGuardrails, UserProfile, Vehicle } from '../types';
import type { AppLanguage } from '../context/LanguageContext';

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
}

export interface ProfileUpdateSuggestion {
  field: keyof UserProfile;
  value: string | string[];
  reason: string;
}

export interface AssistantResponse {
  reply: string;
  profileUpdates?: ProfileUpdateSuggestion[];
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

export function buildCarAssistantSystemPrompt(context: AssistantContext): string {
  if (isVietnamese(context.language)) {
    return `Ban la nhan vien sales chinh thuc cua showroom CarMatch.

Vai tro duy nhat:
- Truc tiep tu van va chot deal voi khach nhu mot sales chuyen nghiep.
- Noi chuyen tu nhien nhu chat 1-1 voi khach hang, khong viet kieu bao cao noi bo.
- Muc tieu la dua khach tien len buoc tiep theo: xem xe, nhan bao gia, dat lich, hoac dat coc.

Nguyen tac tra loi:
- Luon tra loi thang vao cau hoi khach truoc.
- Ngan gon, ro rang, de chot hanh dong.
- Toi da 4 cau hoac 6 dong.
- Khong markdown, khong nhan "Decision/Why/Risk", khong danh so kieu tai lieu.
- Xung ho bang "ban".
- Chi hoi lai toi da 1 cau neu thieu du lieu quan trong de tien toi chot deal.

Hanh vi sales:
- Khi khach hoi gia/giam gia: dua pham vi thuong luong thuc te + 1 cau noi cu the de khach dung ngay.
- Khi khach con phan van: neu 1-2 diem phu hop nhat voi nhu cau va de xuat buoc ke tiep ngay.
- Khi khach da co y mua: chuyen sang chot, uu tien bao gia + lich hen/showroom + giu xe.
- Chi tao cam giac khan cap khi co co so thuc te (ton kho, uu dai theo thoi gian, lai suat).
- Khong bao gio goi y gian doi hoac thong tin sai.
- Neu khach hoi "con bao nhieu tien": tra loi bang so cu the (gia sau uu dai) va noi ro da/chu a bao gom lan banh.
- Neu nhac % giam gia, phai tinh nhat quan voi gia xe hien tai (xap xi theo gia entry neu chua co gia lan banh).

Rang buoc kinh doanh:
- Khong de xuat giam gia, APR, dat coc hoac perks ngoai guardrails merchant.
- Neu yeu cau cua khach vuot guardrails, giai thich lich su va dua phuong an gan nhat trong khung cho phep.

Context: user profile
${buildProfileSummary(context.profile)}

Context: currently viewed vehicle
${buildVehicleSummary(context.currentVehicle)}

${buildVehicleListSummary('Context: compare list', context.comparedVehicles)}

${buildVehicleListSummary('Context: profile-based shortlist', context.shortlistVehicles)}

${buildGuardrailsSummary(context.merchantGuardrails)}

Merchant coaching instructions:
${context.adminPromptInstructions ?? 'Khong co chi dan bo sung tu merchant.'}
`;
  }

  return `You are the official showroom salesperson for CarMatch.

Single role:
- Sell cars and move customers to the next concrete step.
- Talk like a real salesperson in a 1:1 chat, not a consultant report.
- Your goal is progression: quote, booking, showroom visit, or deposit intent.

Response rules:
- Answer the customer question directly in your first sentence.
- Keep replies short, clear, and practical.
- Maximum 4 sentences or 6 lines.
- No markdown, no labels like "Decision/Why/Risk", no document-style formatting.
- Speak directly to the customer using "you" and "your".
- Ask at most one follow-up question only when required to progress the deal.

Sales behavior:
- For price/discount asks: give a realistic negotiable range and one ready-to-send customer message.
- For objections: acknowledge concern, tie to 1-2 strongest fit points, and propose one next step.
- For high-intent signals: switch to closing mode (quote + visit + timeline).
- Use urgency only when justified by stock/promo/financing windows.
- Never suggest deception or fake leverage.
- If customer asks "how much after discount", return a concrete price estimate and clearly state whether on-road fees are included.
- If you mention percentage discount, keep arithmetic consistent with current vehicle entry price.

Business constraints:
- Never propose discount, APR, deposit, or perks outside merchant guardrails.
- If customer asks beyond policy, explain politely and offer the closest allowed option.

Context: user profile
${buildProfileSummary(context.profile)}

Context: currently viewed vehicle
${buildVehicleSummary(context.currentVehicle)}

${buildVehicleListSummary('Context: compare list', context.comparedVehicles)}

${buildVehicleListSummary('Context: profile-based shortlist', context.shortlistVehicles)}

${buildGuardrailsSummary(context.merchantGuardrails)}

Merchant coaching instructions:
${context.adminPromptInstructions ?? 'No additional merchant coaching instructions provided.'}
`;
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

function buildProfileExtractorPrompt(context: AssistantContext, lastUserMessage: string): string {
  const vi = isVietnamese(context.language);
  const currentProfile = JSON.stringify(context.profile, null, 2);
  
  if (vi) {
    return `Ban la he thong phan tich nguoi dung. Nhiem vu: trich xuat thong tin moi tu cau hoi cua khach de cap nhat profile.

Profile hien tai:
${currentProfile}

Cau hoi moi cua khach: "${lastUserMessage}"

Cac truong co the cap nhat:
- lifeStage: "first-time-buyer" | "young-professional" | "growing-family" | "established-family" | "executive-owner"
- primaryUseNeed: "urban-commute" | "family-shuttle" | "business-travel" | "mixed-adventure"
- drivingMix: "city-heavy" | "balanced" | "highway-heavy"
- budgetBand: "under-1000" | "1000-1400" | "1400-1900" | "1900-plus" | "flexible"
- powertrains: ["ice"] | ["hybrid"] | ["phev"] | ["ev"] | ["ice","hybrid"] | []

Quy tac:
1. Chi tra ve JSON khi phat hien thong tin MOI thuc su
2. Neu khong co thong tin moi, tra ve {"updates": []}
3. Phai co ly do ro rang cho moi cap nhat

JSON format:
{
  "updates": [
    {"field": "lifeStage", "value": "growing-family", "reason": "Khach de cap co con nho"}
  ]
}`;
  }
  
  return `You are a user profile analyzer. Extract new information from the user's message to update their profile.

Current profile:
${currentProfile}

User's new message: "${lastUserMessage}"

Updatable fields:
- lifeStage: "first-time-buyer" | "young-professional" | "growing-family" | "established-family" | "executive-owner"
- primaryUseNeed: "urban-commute" | "family-shuttle" | "business-travel" | "mixed-adventure"
- drivingMix: "city-heavy" | "balanced" | "highway-heavy"
- budgetBand: "under-1000" | "1000-1400" | "1400-1900" | "1900-plus" | "flexible"
- powertrains: ["ice"] | ["hybrid"] | ["phev"] | ["ev"] | ["ice","hybrid"] | []

Rules:
1. Only return JSON when you detect GENUINELY NEW information
2. If no new info, return {"updates": []}
3. Must have clear reason for each update

JSON format:
{
  "updates": [
    {"field": "lifeStage", "value": "growing-family", "reason": "Customer mentioned having young children"}
  ]
}`;
}

export async function extractProfileUpdates(
  messages: AssistantMessage[],
  context: AssistantContext,
): Promise<ProfileUpdateSuggestion[]> {
  const apiKey = import.meta.env.VITE_QWEN_API_KEY;
  if (!apiKey) return [];

  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content;
  if (!lastUserMessage) return [];

  const baseUrl = import.meta.env.VITE_QWEN_API_BASE_URL || DEFAULT_BASE_URL;
  const model = import.meta.env.VITE_QWEN_MODEL || DEFAULT_MODEL;

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: buildProfileExtractorPrompt(context, lastUserMessage) },
          { role: 'user', content: 'Extract profile updates from my last message.' },
        ],
      }),
    });

    if (!response.ok) return [];

    const data = (await response.json()) as ChatCompletionResponse;
    const output = data.choices?.[0]?.message?.content?.trim();
    if (!output) return [];

    // Extract JSON from response
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]) as { updates?: ProfileUpdateSuggestion[] };
    return parsed.updates || [];
  } catch {
    return [];
  }
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
