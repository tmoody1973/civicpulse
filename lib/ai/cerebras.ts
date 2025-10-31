/**
 * Cerebras AI Integration for Bill Analysis
 *
 * Uses GPT OSS 120B model for fast, cost-effective bill analysis
 * - 10x faster than Claude
 * - 90% cheaper
 * - Perfect for bill summaries and analysis
 */

import Cerebras from '@cerebras/cerebras_cloud_sdk';

const cerebras = new Cerebras({
  apiKey: process.env.CEREBRAS_API_KEY,
});

interface Bill {
  id: string;
  title: string;
  summary: string | null;
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
 * Generate comprehensive AI analysis of a bill
 */
export async function generateBillAnalysis(bill: Bill): Promise<BillAnalysis> {
  const prompt = `You are a legislative analyst. Analyze this bill and provide a comprehensive, unbiased analysis.

Bill: ${bill.bill_type.toUpperCase()} ${bill.bill_number} - ${bill.title}
Sponsor: ${bill.sponsor_name} (${bill.sponsor_party})
${bill.summary ? `Summary: ${bill.summary}` : ''}
${bill.latest_action_text ? `Latest Action: ${bill.latest_action_text}` : ''}

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

Be specific, factual, and non-partisan. Focus on real-world impact.`;

  try {
    // Use non-streaming for reliable JSON parsing
    const response = await cerebras.chat.completions.create({
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

    const choices = response.choices as Array<{ message?: { content?: string } }>;
    const content = choices[0]?.message?.content || '';

    // Clean up response - remove markdown code blocks if present
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    // Parse JSON response
    const analysis = JSON.parse(cleanedContent);

    // Validate required fields
    if (!analysis.whatItDoes || !analysis.whoItAffects || !analysis.keyProvisions) {
      throw new Error('Invalid analysis structure');
    }

    return analysis;
  } catch (error) {
    console.error('Cerebras API error:', error);

    // Return a fallback minimal analysis if parsing fails
    return {
      whatItDoes: `This bill, titled "${bill.title}", is currently being processed. Full analysis is temporarily unavailable.`,
      whoItAffects: ['General public', 'Government entities'],
      keyProvisions: ['Detailed provisions pending'],
      potentialImpact: {
        positive: ['To be determined pending full analysis'],
        negative: ['To be determined pending full analysis'],
        neutral: [],
      },
    };
  }
}

/**
 * Generate a quick plain-English summary (non-streaming)
 */
export async function generateQuickSummary(bill: Bill): Promise<string> {
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
 * Answer a specific question about a bill using Cerebras
 * (Used when SmartBucket documentChat is not available)
 */
export async function answerBillQuestion(
  bill: Bill,
  question: string,
  context?: string
): Promise<string> {
  const billInfo = `
Bill Number: ${bill.bill_type.toUpperCase()} ${bill.bill_number}
Title: ${bill.title}
${bill.sponsor_name ? `Sponsor: ${bill.sponsor_name} (${bill.sponsor_party || 'Unknown Party'})` : ''}
${bill.introduced_date ? `Introduced: ${bill.introduced_date}` : ''}
${bill.latest_action_text ? `Latest Action: ${bill.latest_action_text}` : ''}
${bill.summary ? `\nOfficial Summary:\n${bill.summary}` : ''}
${context ? `\nAdditional Context:\n${context}` : ''}
`.trim();

  const prompt = `You are a helpful legislative assistant. Answer the user's question about this bill based on the available information.

${billInfo}

User Question: ${question}

Instructions:
- Provide a clear, helpful answer based on the bill information above
- If the question asks about specific details not in the summary, explain what we know and acknowledge what's not available
- Use plain language and be conversational
- If full text isn't available, work with the title, summary, and latest action
- If you truly cannot answer due to lack of information, suggest what kind of information would be needed

Answer:`;

  try {
    const stream = await cerebras.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful legislative assistant. Answer questions about bills clearly and accurately.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'gpt-oss-120b',
      stream: true,
      max_completion_tokens: 500,
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
