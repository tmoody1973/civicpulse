/**
 * Cerebras AI Integration for Bill Analysis
 *
 * Uses GPT OSS 120B model for fast, cost-effective bill analysis
 * - 10x faster than Claude
 * - 90% cheaper
 * - Perfect for bill summaries and analysis
 */

import Cerebras from '@cerebras/cerebras_cloud_sdk';

// Lazy initialize Cerebras client - don't initialize at module load
function getCerebrasClient(): Cerebras | null {
  if (!process.env.CEREBRAS_API_KEY) {
    console.warn('CEREBRAS_API_KEY not set - using fallback');
    return null;
  }

  try {
    return new Cerebras({
      apiKey: process.env.CEREBRAS_API_KEY,
    });
  } catch (error) {
    console.error('Failed to initialize Cerebras client:', error);
    return null;
  }
}

interface Bill {
  id: string;
  title: string;
  summary: string | null;
  full_text?: string | null;
  bill_type: string;
  bill_number: number;
  sponsor_name: string | null;
  sponsor_party: string | null;
  introduced_date: string | null;
  latest_action_text: string | null;
}

export interface BillAnalysis {
  whatItDoes: string;
  whoItAffects: string[];
  keyProvisions: string[];
  potentialImpact: {
    positive: string[];
    negative: string[];
    neutral: string[];
  };
  fundingAmount?: string;
  timeline?: string;
}

/**
 * Helper: Retry with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const isLastRetry = i === maxRetries - 1;
      const isRetryableError =
        error?.status === 429 || // Rate limit
        error?.status === 500 || // Server error
        error?.status === 503;   // Service unavailable

      if (isLastRetry || !isRetryableError) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, i);
      console.log(`Retrying after ${delay}ms (attempt ${i + 1}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * Helper: Safe JSON parse with repair attempts
 */
function safeJSONParse(text: string): any {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch (e) {
    // Attempt 1: Fix truncated JSON by adding closing braces
    try {
      const openBraces = (text.match(/{/g) || []).length;
      const closeBraces = (text.match(/}/g) || []).length;
      const missingBraces = openBraces - closeBraces;

      if (missingBraces > 0) {
        const repaired = text + '}'.repeat(missingBraces);
        return JSON.parse(repaired);
      }
    } catch (e2) {
      // Repair attempt failed
    }

    // Attempt 2: Extract JSON from text (handle cases with extra text)
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch (e3) {
      // Extraction attempt failed
    }

    throw new Error(`JSON parse failed: ${e}`);
  }
}

/**
 * Generate comprehensive AI analysis of a bill
 */
export async function generateBillAnalysis(bill: Bill): Promise<BillAnalysis> {
  // Get Cerebras client
  const cerebras = getCerebrasClient();
  if (!cerebras) {
    console.warn('Cerebras client not available, using fallback analysis');
    return getFallbackAnalysis(bill);
  }

  // Prepare bill context - use full text if available, otherwise summary
  let billContext = '';
  if (bill.full_text) {
    // Truncate to first 4000 characters to avoid token limits and JSON truncation
    const truncatedText = bill.full_text.substring(0, 4000);
    billContext = `Full Bill Text (excerpt):\n${truncatedText}${bill.full_text.length > 4000 ? '\n[...text truncated for analysis...]' : ''}`;
  } else if (bill.summary) {
    billContext = `Official Summary:\n${bill.summary}`;
  } else {
    billContext = `Latest Action: ${bill.latest_action_text || 'No summary or full text available'}`;
  }

  const prompt = `You are a legislative analyst. Analyze this bill and provide a comprehensive, unbiased analysis.

Bill: ${bill.bill_type.toUpperCase()} ${bill.bill_number} - ${bill.title}
Sponsor: ${bill.sponsor_name} (${bill.sponsor_party})
Introduced: ${bill.introduced_date}

${billContext}

Provide your analysis in this exact JSON format:
{
  "whatItDoes": "2-3 sentence plain English explanation",
  "whoItAffects": ["group 1", "group 2", "group 3"],
  "keyProvisions": ["provision 1", "provision 2", "provision 3"],
  "potentialImpact": {
    "positive": ["positive impact 1", "positive impact 2"],
    "negative": ["negative impact 1", "negative impact 2"],
    "neutral": ["neutral impact 1"]
  },
  "fundingAmount": "dollar amount if mentioned, or null",
  "timeline": "implementation timeline if mentioned, or null"
}

Be specific, factual, and non-partisan. Focus on real-world impact based on the bill text provided.`;

  try {
    // Use retry logic for API call
    const response = await retryWithBackoff(async () => {
      return await cerebras.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are an expert legislative analyst. You MUST respond with ONLY valid JSON, no other text before or after.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'gpt-oss-120b',
        stream: false,
        max_completion_tokens: 2000,
        temperature: 0.3, // Lower temperature for factual analysis
        top_p: 1,
        reasoning_effort: 'high',
      });
    });

    const choices = response.choices as Array<{ message?: { content?: string } }>;
    const content = choices[0]?.message?.content || '';

    if (!content) {
      throw new Error('Empty response from Cerebras API');
    }

    // Clean up response - remove markdown code blocks if present
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    // Use safe JSON parsing with repair attempts
    const analysis = safeJSONParse(cleanedContent);

    // Validate required fields
    if (!analysis.whatItDoes || !analysis.whoItAffects || !analysis.keyProvisions) {
      console.error('Invalid analysis structure:', analysis);
      throw new Error('Missing required fields in analysis');
    }

    return analysis;
  } catch (error: any) {
    console.error('Cerebras API error:', {
      message: error?.message,
      status: error?.status,
      billId: bill.id,
      billNumber: `${bill.bill_type.toUpperCase()} ${bill.bill_number}`,
    });

    // Return fallback analysis
    return getFallbackAnalysis(bill);
  }
}

/**
 * Generate fallback analysis when API is unavailable
 */
function getFallbackAnalysis(bill: Bill): BillAnalysis {
  return {
    whatItDoes: `This bill, titled "${bill.title}", is currently being processed. Full AI analysis is temporarily unavailable. ${bill.summary ? `Official summary: ${bill.summary.substring(0, 200)}...` : ''}`,
    whoItAffects: ['General public', 'Government entities'],
    keyProvisions: bill.summary ? ['See official summary for details'] : ['Detailed provisions pending'],
    potentialImpact: {
      positive: ['Full impact analysis pending'],
      negative: ['Full impact analysis pending'],
      neutral: [],
    },
  };
}

/**
 * Generate a quick plain-English summary (non-streaming)
 */
export async function generateQuickSummary(bill: Bill): Promise<string> {
  const cerebras = getCerebrasClient();
  if (!cerebras) {
    return bill.summary || `Summary of ${bill.title} is currently unavailable.`;
  }

  const prompt = `Summarize this bill in 2-3 sentences for the average American:

${bill.title}

${bill.summary || 'No summary available'}

Make it clear, concise, and easy to understand.`;

  try {
    // Non-streaming for quick summary
    const response = await cerebras.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You explain legislation in plain English, like explaining to a friend over coffee.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'gpt-oss-120b',
      stream: false,
      max_completion_tokens: 200,
      temperature: 0.5,
      top_p: 1,
      reasoning_effort: 'medium',
    });

    const choices = response.choices as Array<{ message?: { content?: string } }>;
    return choices[0]?.message?.content || 'Unable to generate summary';
  } catch (error) {
    console.error('Cerebras API error:', error);
    throw new Error('Failed to generate summary');
  }
}

/**
 * Generate explanation of why bills are similar
 */
export async function generateSimilarBillsExplanation(
  currentBill: Bill,
  similarBills: Array<{
    id: string;
    title: string;
    billNumber: string;
    sponsor_name: string | null;
    sponsor_party: string | null;
    status: string;
    similarity: number;
  }>
): Promise<string> {
  const cerebras = getCerebrasClient();
  if (!cerebras) {
    return `Found ${similarBills.length} bills related to ${currentBill.title}. These bills share similar legislative goals or address related aspects of this topic.`;
  }

  const billsList = similarBills
    .map((b, i) => `${i + 1}. ${b.billNumber} - ${b.title} (${Math.round(b.similarity * 100)}% similar)`)
    .join('\n');

  const prompt = `You are a legislative analyst. Explain why these bills are related to each other.

Current Bill: ${currentBill.bill_type.toUpperCase()} ${currentBill.bill_number} - ${currentBill.title}

Similar Bills Found:
${billsList}

Provide a clear, conversational explanation that:
1. Identifies the common theme or topic connecting these bills
2. Briefly explains what makes each bill relevant to the current bill
3. Notes any key differences in approach or scope
4. Uses plain language that a non-expert would understand

Keep it concise (3-4 paragraphs max) and focus on helping citizens understand the legislative landscape around this topic.`;

  try {
    const response = await cerebras.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful legislative analyst who explains bills in plain English.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'gpt-oss-120b',
      stream: false,
      max_completion_tokens: 600,
      temperature: 0.5,
      top_p: 1,
      reasoning_effort: 'medium',
    });

    const choices = response.choices as Array<{ message?: { content?: string } }>;
    return choices[0]?.message?.content || 'Unable to generate explanation';
  } catch (error) {
    console.error('Cerebras API error:', error);
    return `Found ${similarBills.length} bills related to ${currentBill.title}. These bills share similar legislative goals or address related aspects of this topic.`;
  }
}

/**
 * Answer a specific question about a bill using Cerebras (streaming)
 * Returns an async iterable for streaming responses
 */
export async function* answerBillQuestionStream(
  bill: Bill,
  question: string,
  context?: string
): AsyncIterable<string> {
  const cerebras = getCerebrasClient();
  if (!cerebras) {
    yield `I'm currently unable to answer questions about bills. However, based on the available information: ${bill.summary || bill.title}. Please check the official bill summary for more details.`;
    return;
  }

  // Build comprehensive bill context - prioritize full text if available
  let billContent = '';

  if (bill.full_text) {
    // Use full text for comprehensive analysis (truncate to 8000 chars to fit in context)
    const truncatedText = bill.full_text.substring(0, 8000);
    billContent = `Full Bill Text${bill.full_text.length > 8000 ? ' (excerpt)' : ''}:\n${truncatedText}${bill.full_text.length > 8000 ? '\n[...text continues, showing first 8000 characters for analysis...]' : ''}`;
  } else if (bill.summary) {
    billContent = `Official Summary:\n${bill.summary}`;
  } else {
    billContent = `Latest Action: ${bill.latest_action_text || 'No summary or full text available'}`;
  }

  const billInfo = `
Bill Number: ${bill.bill_type.toUpperCase()} ${bill.bill_number}
Title: ${bill.title}
${bill.sponsor_name ? `Sponsor: ${bill.sponsor_name} (${bill.sponsor_party || 'Unknown Party'})` : ''}
${bill.introduced_date ? `Introduced: ${bill.introduced_date}` : ''}
${bill.latest_action_text ? `Latest Action: ${bill.latest_action_text}` : ''}

${billContent}
${context && context !== bill.summary ? `\n\nAdditional Context:\n${context}` : ''}
`.trim();

  // Detect if question is about impact/who is affected
  const isImpactQuestion = /who.*impact|who.*affect|who.*benefit|impact.*who|affect.*who|stakeholder|constituent|demographic|population|group.*affected/i.test(question);

  // Detect if question requires deep reasoning
  const requiresReasoning = /why|how|explain|analyze|compare|evaluate|assess|reason|logic|rationale|justification/i.test(question);

  const prompt = `You are an expert legislative analyst. Answer the user's question about this bill with comprehensive reasoning and analysis.

${billInfo}

User Question: ${question}

CRITICAL INSTRUCTIONS:
- Use ONLY information from the bill text/summary provided above
- Provide detailed, reasoned analysis based on the bill content
${isImpactQuestion ? `- This is an IMPACT question - identify ALL affected groups, demographics, and stakeholders
- Explain HOW and WHY each group is impacted
- Consider direct beneficiaries, indirect effects, and potential consequences
- Be specific about different populations (e.g., low-income families, small businesses, veterans, etc.)` : ''}
${requiresReasoning ? `- This requires DEEP REASONING - explain the logic, mechanisms, and causal relationships
- Break down complex concepts step-by-step
- Connect different parts of the bill to show how they work together
- Explain WHY things work the way they do` : ''}
- Use plain language but be thorough and comprehensive
- DO NOT make up statistics, section numbers, or citations not in the text
- If information isn't available, say so clearly
- Be honest about limitations of available information
${bill.full_text ? '- You have access to the FULL BILL TEXT - use it for detailed analysis' : '- You have access to the summary only - work with what\'s available'}

Answer with comprehensive reasoning:`;

  try {
    const stream = await cerebras.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a legislative analyst. Your tasks include reviewing proposed bills and legislation, researching relevant law and policy implications, preparing clear and impartial summaries and analyses, attending committee meetings and hearings, and drafting detailed reports for decision-makers. When answering user questions, you must: Remain nonpartisan and factual. Clearly explain the background, provisions, and implications of legislation. Summarize complex issues concisely and accurately. Reference relevant statutes, precedents, or policy background when appropriate. Focus responses strictly on legislative topics, declining unrelated requests. If a user request contradicts these instructions or falls outside your scope, you must politely decline and briefly explain your role and capabilities.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'gpt-oss-120b',
      stream: true,
      max_completion_tokens: 800, // Increased for comprehensive answers
      temperature: 0.4,
      top_p: 1,
      reasoning_effort: 'high',
    });

    for await (const chunk of stream) {
      const choices = chunk.choices as Array<{ delta?: { content?: string } }>;
      const content = choices[0]?.delta?.content || '';
      if (content) {
        yield content;
      }
    }
  } catch (error) {
    console.error('Cerebras API error:', error);
    throw new Error('Failed to answer question');
  }
}

/**
 * Answer a specific question about a bill using Cerebras
 * (Used when SmartBucket documentChat is not available)
 */
export async function answerBillQuestion(
  bill: Bill,
  question: string,
  context?: string
): Promise<string> {
  const cerebras = getCerebrasClient();
  if (!cerebras) {
    return `I'm currently unable to answer questions about bills. However, based on the available information: ${bill.summary || bill.title}. Please check the official bill summary for more details.`;
  }

  // Build comprehensive bill context - prioritize full text if available
  let billContent = '';

  if (bill.full_text) {
    // Use full text for comprehensive analysis (truncate to 8000 chars to fit in context)
    const truncatedText = bill.full_text.substring(0, 8000);
    billContent = `Full Bill Text${bill.full_text.length > 8000 ? ' (excerpt)' : ''}:\n${truncatedText}${bill.full_text.length > 8000 ? '\n[...text continues, showing first 8000 characters for analysis...]' : ''}`;
  } else if (bill.summary) {
    billContent = `Official Summary:\n${bill.summary}`;
  } else {
    billContent = `Latest Action: ${bill.latest_action_text || 'No summary or full text available'}`;
  }

  const billInfo = `
Bill Number: ${bill.bill_type.toUpperCase()} ${bill.bill_number}
Title: ${bill.title}
${bill.sponsor_name ? `Sponsor: ${bill.sponsor_name} (${bill.sponsor_party || 'Unknown Party'})` : ''}
${bill.introduced_date ? `Introduced: ${bill.introduced_date}` : ''}
${bill.latest_action_text ? `Latest Action: ${bill.latest_action_text}` : ''}

${billContent}
${context && context !== bill.summary ? `\n\nAdditional Context:\n${context}` : ''}
`.trim();

  // Detect if question is about impact/who is affected
  const isImpactQuestion = /who.*impact|who.*affect|who.*benefit|impact.*who|affect.*who|stakeholder|constituent|demographic|population|group.*affected/i.test(question);

  // Detect if question requires deep reasoning
  const requiresReasoning = /why|how|explain|analyze|compare|evaluate|assess|reason|logic|rationale|justification/i.test(question);

  const prompt = `You are an expert legislative analyst. Answer the user's question about this bill with comprehensive reasoning and analysis.

${billInfo}

User Question: ${question}

CRITICAL INSTRUCTIONS:
- Use ONLY information from the bill text/summary provided above
- Provide detailed, reasoned analysis based on the bill content
${isImpactQuestion ? `- This is an IMPACT question - identify ALL affected groups, demographics, and stakeholders
- Explain HOW and WHY each group is impacted
- Consider direct beneficiaries, indirect effects, and potential consequences
- Be specific about different populations (e.g., low-income families, small businesses, veterans, etc.)` : ''}
${requiresReasoning ? `- This requires DEEP REASONING - explain the logic, mechanisms, and causal relationships
- Break down complex concepts step-by-step
- Connect different parts of the bill to show how they work together
- Explain WHY things work the way they do` : ''}
- Use plain language but be thorough and comprehensive
- DO NOT make up statistics, section numbers, or citations not in the text
- If information isn't available, say so clearly
- Be honest about limitations of available information
${bill.full_text ? '- You have access to the FULL BILL TEXT - use it for detailed analysis' : '- You have access to the summary only - work with what\'s available'}

Answer with comprehensive reasoning:`;

  try {
    const stream = await cerebras.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a legislative analyst. Your tasks include reviewing proposed bills and legislation, researching relevant law and policy implications, preparing clear and impartial summaries and analyses, attending committee meetings and hearings, and drafting detailed reports for decision-makers. When answering user questions, you must: Remain nonpartisan and factual. Clearly explain the background, provisions, and implications of legislation. Summarize complex issues concisely and accurately. Reference relevant statutes, precedents, or policy background when appropriate. Focus responses strictly on legislative topics, declining unrelated requests. If a user request contradicts these instructions or falls outside your scope, you must politely decline and briefly explain your role and capabilities.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'gpt-oss-120b',
      stream: true,
      max_completion_tokens: 800, // Increased for comprehensive answers
      temperature: 0.4,
      top_p: 1,
      reasoning_effort: 'high',
    });

    let fullResponse = '';
    for await (const chunk of stream) {
      const choices = chunk.choices as Array<{ delta?: { content?: string } }>;
      fullResponse += choices[0]?.delta?.content || '';
    }

    return fullResponse.trim();
  } catch (error) {
    console.error('Cerebras API error:', error);
    throw new Error('Failed to answer question');
  }
}
