/**
 * AI Assistant Tools
 * Tool definitions for: inventory search, policy check, finance calculation, appointment booking
 * Aligned with PRD funnel stages and optimization plan Phase 3
 */

import type { MerchantDealGuardrails } from '../../types';
import { vehicles } from '../../data/vehicles';
import { showrooms } from '../../data/showrooms';

// ============================================================================
// Tool Type Definitions
// ============================================================================

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  latencyMs: number;
}

export interface PriceEstimateToolInput {
  vehicleId: string;
  discountPct?: number;
  includeOnRoad?: boolean;
}

export interface PriceEstimateToolOutput {
  vehicleName: string;
  basePrice: number;
  discountAmount: number;
  finalPrice: number;
  onRoadFees?: number;
  totalPrice: number;
  currency: string;
  disclaimer: string;
}

export interface FinanceEstimateToolInput {
  vehiclePrice: number;
  downPaymentPct: number;
  loanTermMonths: number;
  aprPct: number;
}

export interface FinanceEstimateToolOutput {
  loanAmount: number;
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
  apr: number;
  termMonths: number;
  disclaimer: string;
}

export interface ShowroomLookupToolInput {
  city?: string;
  vehicleId?: string;
}

export interface ShowroomLookupToolOutput {
  showrooms: Array<{
    id: string;
    name: string;
    address: string;
    city: string;
    phone: string;
    distance?: string;
    hasStock?: boolean;
  }>;
  count: number;
}

export interface PolicyCheckToolInput {
  requestType: 'discount' | 'apr' | 'deposit' | 'perk';
  requestedValue: number | string;
  guardrails: MerchantDealGuardrails;
}

export interface PolicyCheckToolOutput {
  isAllowed: boolean;
  allowedRange?: { min: number; max: number };
  requestedValue: number | string;
  message: string;
  suggestion?: string;
}

export interface AppointmentBookingToolInput {
  showroomId: string;
  preferredDate?: string;
  preferredTime?: string;
  vehicleId?: string;
  customerName?: string;
  customerPhone?: string;
}

export interface AppointmentBookingToolOutput {
  success: boolean;
  appointmentId?: string;
  confirmedDate?: string;
  confirmedTime?: string;
  showroomName: string;
  message: string;
  nextSteps: string[];
}

// ============================================================================
// Tool Implementations
// ============================================================================

/**
 * Tool: Price Estimator
 * Calculates realistic price with discount within merchant guardrails
 */
export async function priceEstimatorTool(
  input: PriceEstimateToolInput
): Promise<ToolResult<PriceEstimateToolOutput>> {
  const startTime = performance.now();
  
  try {
    const vehicle = vehicles.find(v => v.id === input.vehicleId);
    if (!vehicle) {
      return {
        success: false,
        error: `Vehicle not found: ${input.vehicleId}`,
        latencyMs: performance.now() - startTime,
      };
    }

    const basePrice = vehicle.priceEntryMilVnd * 1000000; // Convert to VND
    const discountPct = Math.min(input.discountPct || 0, 7); // Cap at 7% per policy
    const discountAmount = basePrice * (discountPct / 100);
    const finalPrice = basePrice - discountAmount;
    
    // On-road fees estimate (registration, insurance, plates) ~10-15%
    const onRoadFees = input.includeOnRoad ? finalPrice * 0.12 : 0;
    const totalPrice = finalPrice + onRoadFees;

    return {
      success: true,
      data: {
        vehicleName: `${vehicle.name} (${vehicle.trim})`,
        basePrice,
        discountAmount,
        finalPrice,
        onRoadFees,
        totalPrice,
        currency: 'VND',
        disclaimer: discountPct > 5 
          ? 'Discount above 5% requires showroom manager approval.'
          : 'Price estimate subject to final showroom confirmation.',
      },
      latencyMs: performance.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      latencyMs: performance.now() - startTime,
    };
  }
}

/**
 * Tool: Finance Estimator
 * Calculates monthly payment based on loan parameters
 */
export async function financeEstimatorTool(
  input: FinanceEstimateToolInput
): Promise<ToolResult<FinanceEstimateToolOutput>> {
  const startTime = performance.now();
  
  try {
    const { vehiclePrice, downPaymentPct, loanTermMonths, aprPct } = input;
    
    // Validate inputs
    if (downPaymentPct < 15 || downPaymentPct > 80) {
      return {
        success: false,
        error: 'Down payment must be between 15% and 80%',
        latencyMs: performance.now() - startTime,
      };
    }
    
    if (aprPct < 0 || aprPct > 20) {
      return {
        success: false,
        error: 'APR must be between 0% and 20%',
        latencyMs: performance.now() - startTime,
      };
    }

    const downPayment = vehiclePrice * (downPaymentPct / 100);
    const loanAmount = vehiclePrice - downPayment;
    
    // Monthly payment calculation using amortization formula
    const monthlyRate = aprPct / 100 / 12;
    let monthlyPayment: number;
    
    if (monthlyRate === 0) {
      monthlyPayment = loanAmount / loanTermMonths;
    } else {
      monthlyPayment = loanAmount * 
        (monthlyRate * Math.pow(1 + monthlyRate, loanTermMonths)) /
        (Math.pow(1 + monthlyRate, loanTermMonths) - 1);
    }
    
    const totalPayment = monthlyPayment * loanTermMonths;
    const totalInterest = totalPayment - loanAmount;

    return {
      success: true,
      data: {
        loanAmount,
        monthlyPayment,
        totalInterest,
        totalPayment,
        apr: aprPct,
        termMonths: loanTermMonths,
        disclaimer: 'Estimated payment only. Final terms subject to credit approval and lender conditions.',
      },
      latencyMs: performance.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      latencyMs: performance.now() - startTime,
    };
  }
}

/**
 * Tool: Showroom Lookup
 * Finds showrooms by district or vehicle availability
 */
export async function showroomLookupTool(
  input: ShowroomLookupToolInput
): Promise<ToolResult<ShowroomLookupToolOutput>> {
  const startTime = performance.now();
  
  try {
    let filtered = showrooms;
    
    if (input.city) {
      const cityLower = input.city.toLowerCase();
      filtered = filtered.filter(s => 
        s.district.toLowerCase().includes(cityLower) ||
        s.address.toLowerCase().includes(cityLower)
      );
    }
    
    // In production, would check real inventory for hasStock
    const results = filtered.map(s => ({
      id: s.id,
      name: s.name,
      address: s.address,
      city: s.district,
      phone: s.phone,
      hasStock: true, // Placeholder
    }));

    return {
      success: true,
      data: {
        showrooms: results,
        count: results.length,
      },
      latencyMs: performance.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      latencyMs: performance.now() - startTime,
    };
  }
}

/**
 * Tool: Policy Check
 * Validates if a requested discount/APR/deposit/perk is within merchant guardrails
 */
export async function policyCheckTool(
  input: PolicyCheckToolInput
): Promise<ToolResult<PolicyCheckToolOutput>> {
  const startTime = performance.now();
  
  try {
    const { requestType, requestedValue, guardrails } = input;
    const numericValue = typeof requestedValue === 'string' 
      ? parseFloat(requestedValue) 
      : requestedValue;

    switch (requestType) {
      case 'discount': {
        const min = guardrails.discountMinPct;
        const max = guardrails.discountMaxPct;
        const isAllowed = numericValue >= min && numericValue <= max;
        
        return {
          success: true,
          data: {
            isAllowed,
            allowedRange: { min, max },
            requestedValue: numericValue,
            message: isAllowed 
              ? `Discount of ${numericValue}% is within approved range.`
              : `Requested discount ${numericValue}% exceeds authorized range.`,
            suggestion: !isAllowed 
              ? `Maximum approved discount is ${max}%. For higher discounts, manager approval required.`
              : undefined,
          },
          latencyMs: performance.now() - startTime,
        };
      }
      
      case 'apr': {
        const min = guardrails.aprMinPct;
        const max = guardrails.aprMaxPct;
        const isAllowed = numericValue >= min && numericValue <= max;
        
        return {
          success: true,
          data: {
            isAllowed,
            allowedRange: { min, max },
            requestedValue: numericValue,
            message: isAllowed 
              ? `APR of ${numericValue}% is within approved range.`
              : `Requested APR ${numericValue}% is outside authorized range.`,
            suggestion: !isAllowed 
              ? `Approved APR range is ${min}% to ${max}%.`
              : undefined,
          },
          latencyMs: performance.now() - startTime,
        };
      }
      
      case 'deposit': {
        const min = guardrails.minDepositPct;
        const max = guardrails.maxDepositPct;
        const isAllowed = numericValue >= min && numericValue <= max;
        
        return {
          success: true,
          data: {
            isAllowed,
            allowedRange: { min, max },
            requestedValue: numericValue,
            message: isAllowed 
              ? `Deposit of ${numericValue}% is within approved range.`
              : `Requested deposit ${numericValue}% is outside authorized range.`,
            suggestion: !isAllowed 
              ? `Minimum required deposit is ${min}%.`
              : undefined,
          },
          latencyMs: performance.now() - startTime,
        };
      }
      
      case 'perk': {
        const perkName = typeof requestedValue === 'string' 
          ? requestedValue.toLowerCase() 
          : '';
        const isAllowed = guardrails.allowedPerks.some(
          p => p.toLowerCase().includes(perkName) || perkName.includes(p.toLowerCase())
        );
        
        return {
          success: true,
          data: {
            isAllowed,
            allowedRange: undefined,
            requestedValue,
            message: isAllowed 
              ? `Perk "${requestedValue}" is approved for inclusion.`
              : `Perk "${requestedValue}" is not in the approved list.`,
            suggestion: !isAllowed 
              ? `Available perks: ${guardrails.allowedPerks.join(', ')}`
              : undefined,
          },
          latencyMs: performance.now() - startTime,
        };
      }
      
      default:
        return {
          success: false,
          error: `Unknown request type: ${requestType}`,
          latencyMs: performance.now() - startTime,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      latencyMs: performance.now() - startTime,
    };
  }
}

/**
 * Tool: Appointment Booking
 * Creates a showroom appointment (simulated for MVP)
 */
export async function appointmentBookingTool(
  input: AppointmentBookingToolInput
): Promise<ToolResult<AppointmentBookingToolOutput>> {
  const startTime = performance.now();
  
  try {
    const showroom = showrooms.find(s => s.id === input.showroomId);
    if (!showroom) {
      return {
        success: false,
        error: `Showroom not found: ${input.showroomId}`,
        latencyMs: performance.now() - startTime,
      };
    }

    // Simulate booking logic (in production, would call backend API)
    const appointmentId = `apt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const confirmedDate = input.preferredDate || new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const confirmedTime = input.preferredTime || '10:00';

    return {
      success: true,
      data: {
        success: true,
        appointmentId,
        confirmedDate,
        confirmedTime,
        showroomName: showroom.name,
        message: `Appointment successfully booked at ${showroom.name}.`,
        nextSteps: [
          'Confirmation SMS will be sent to your phone',
          'Please arrive 10 minutes early',
          'Bring your ID and proof of income for finance discussion',
          'Request will be assigned to a dedicated sales consultant',
        ],
      },
      latencyMs: performance.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      latencyMs: performance.now() - startTime,
    };
  }
}

// ============================================================================
// Tool Registry
// ============================================================================

export type ToolName = 
  | 'price_estimator'
  | 'finance_estimator'
  | 'showroom_lookup'
  | 'policy_check'
  | 'appointment_booking';

export interface ToolDefinition {
  name: ToolName;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<ToolResult>;
}

export const toolRegistry: Record<ToolName, ToolDefinition> = {
  price_estimator: {
    name: 'price_estimator',
    description: 'Calculate realistic vehicle price with discount within merchant guardrails',
    inputSchema: {
      vehicleId: 'string (required)',
      discountPct: 'number (optional, 0-7)',
      includeOnRoad: 'boolean (optional)',
    },
    execute: (input) => priceEstimatorTool(input as PriceEstimateToolInput),
  },
  
  finance_estimator: {
    name: 'finance_estimator',
    description: 'Estimate monthly loan payments based on price, down payment, term, and APR',
    inputSchema: {
      vehiclePrice: 'number (required)',
      downPaymentPct: 'number (required, 15-80)',
      loanTermMonths: 'number (required)',
      aprPct: 'number (required)',
    },
    execute: (input) => financeEstimatorTool(input as FinanceEstimateToolInput),
  },
  
  showroom_lookup: {
    name: 'showroom_lookup',
    description: 'Find nearby showrooms by city or check vehicle stock availability',
    inputSchema: {
      city: 'string (optional)',
      vehicleId: 'string (optional)',
    },
    execute: (input) => showroomLookupTool(input as ShowroomLookupToolInput),
  },
  
  policy_check: {
    name: 'policy_check',
    description: 'Validate if requested discount, APR, deposit, or perk is within merchant policy',
    inputSchema: {
      requestType: 'string (discount|apr|deposit|perk)',
      requestedValue: 'number|string (required)',
      guardrails: 'MerchantDealGuardrails (required)',
    },
    execute: (input) => policyCheckTool(input as PolicyCheckToolInput),
  },
  
  appointment_booking: {
    name: 'appointment_booking',
    description: 'Book a showroom appointment for test drive or consultation',
    inputSchema: {
      showroomId: 'string (required)',
      preferredDate: 'string (optional, YYYY-MM-DD)',
      preferredTime: 'string (optional, HH:MM)',
      vehicleId: 'string (optional)',
      customerName: 'string (optional)',
      customerPhone: 'string (optional)',
    },
    execute: (input) => appointmentBookingTool(input as AppointmentBookingToolInput),
  },
};

/**
 * Execute a tool by name with validation
 */
export async function executeTool(
  toolName: ToolName,
  input: Record<string, unknown>
): Promise<ToolResult> {
  const tool = toolRegistry[toolName];
  if (!tool) {
    return {
      success: false,
      error: `Unknown tool: ${toolName}`,
      latencyMs: 0,
    };
  }
  
  try {
    return await tool.execute(input);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Tool execution failed',
      latencyMs: 0,
    };
  }
}
