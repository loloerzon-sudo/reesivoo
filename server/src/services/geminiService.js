import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const EXPENSE_CATEGORIES = [
  'Repair Maintenance',
  'De Minimis',
  'Utilities',
  'Subscription',
  'Transportation',
  'Miscellaneous',
  'Gasoline',
  'Representation',
  'Pantry',
  'Medicine/Office Others',
  'Others'
];

export const receiptResponseSchema = {
  type: Type.OBJECT,
  properties: {
    is_receipt: {
      type: Type.BOOLEAN,
      description: 'Set to TRUE if the uploaded image or document is an actual receipt, invoice, official receipt (OR), sales invoice (SI), utility bill, delivery receipt, ticket, or proof of payment. Set to FALSE if the image is a person, selfie, meme, animal/pet, vehicle, landscape, artwork, random object, or unrelated document.',
    },
    invalid_reason: {
      type: Type.STRING,
      description: 'If is_receipt is false, provide a short 3-6 word description of what the image actually is (e.g. "Selfie photo", "Picture of a pet", "Random object"). Return null if is_receipt is true.',
      nullable: true,
    },
    date: {
      type: Type.STRING,
      description: 'Transaction date in YYYY-MM-DD format. If year is omitted or ambiguous, assume current year. Return null if not found.',
      nullable: true,
    },
    payee: {
      type: Type.STRING,
      description: 'Name of the merchant, store, vendor, or establishment.',
      nullable: true,
    },
    tin: {
      type: Type.STRING,
      description: 'Tax Identification Number (TIN) of the merchant, often formatted like 000-000-000-000.',
      nullable: true,
    },
    address: {
      type: Type.STRING,
      description: 'Physical street address or branch location of the merchant.',
      nullable: true,
    },
    invoiceNo: {
      type: Type.STRING,
      description: 'Sales Invoice (SI) number, Official Receipt (OR) number, or invoice reference number.',
      nullable: true,
    },
    category: {
      type: Type.STRING,
      enum: EXPENSE_CATEGORIES,
      description: 'Classification of the expense. You MUST choose the single best fit from the allowed list. If undetermined, use "Others".',
    },
    remarks: {
      type: Type.STRING,
      description: 'Brief 3-8 word summary of what items were purchased or primary business purpose.',
      nullable: true,
    },
    amount: {
      type: Type.NUMBER,
      description: 'Total final gross amount paid as a numeric float. Do NOT include currency symbols.',
      nullable: true,
    },
  },
  required: ['is_receipt', 'category'],
};

export const GEMINI_CASCADE_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-flash-lite-latest',
];

export const DEFAULT_OPENROUTER_MODELS = [
  'google/gemma-4-31b-it:free',
  'minimax/minimax-m3:free',
  'z-ai/glm-5.2:free',
  'meta-llama/llama-3.2-11b-vision-instruct:free',
  'qwen/qwen-2.5-vl-72b-instruct:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'openrouter/free',
];

function extractJsonFromText(rawText) {
  if (!rawText) return {};
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const jsonSubstr = cleaned.substring(firstBrace, lastBrace + 1);
      return JSON.parse(jsonSubstr);
    }
    throw err;
  }
}

function normalizeReceiptResponse(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid JSON structure returned by model');
  }

  // Validation: Verify if uploaded image is an actual receipt
  if (parsed.is_receipt === false) {
    const error = new Error("Oops! Hindi 'to resibo ha! 📸 Please upload or snap a clear photo of an official receipt, invoice, or bill. Your scan credits remain untouched! ✨");
    error.isNotReceipt = true;
    error.invalidReason = parsed.invalid_reason || 'Not a receipt';
    throw error;
  }

  return {
    date: parsed.date || null,
    payee: parsed.payee || null,
    tin: parsed.tin || null,
    address: parsed.address || null,
    invoiceNo: parsed.invoiceNo || null,
    category: EXPENSE_CATEGORIES.includes(parsed.category) ? parsed.category : 'Others',
    remarks: parsed.remarks || null,
    amount: typeof parsed.amount === 'number' ? parsed.amount : (parsed.amount ? parseFloat(parsed.amount) : null),
  };
}

const EXTRACTION_PROMPT = `You are a high-precision financial data extractor for business receipts, invoices, and bills.
First, determine if the image or document is a valid receipt, invoice, official receipt (OR), sales invoice (SI), utility bill, delivery receipt, ticket, or payment document.
- Set is_receipt to true if it is a receipt/financial proof of payment, or false if it is a selfie, person, animal, meme, random object, car, scenery, or unrelated non-receipt document.
- If is_receipt is false, specify invalid_reason.
- If is_receipt is true, extract all available fields into the JSON schema.
- If a text field (date, payee, tin, address, invoiceNo, remarks) cannot be found or is illegible, return null.
- For category, choose the most appropriate category according to standard accounting principles. If not identifiable, select "Others".
- For amount, find the final total gross amount paid.`;

async function callGemini(ai, modelName, mimeType, base64Data) {
  const response = await ai.models.generateContent({
    model: modelName,
    contents: [
      {
        text: EXTRACTION_PROMPT,
      },
      {
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: base64Data,
        },
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: receiptResponseSchema,
      temperature: 0.1,
    },
  });

  const rawText = response.text?.trim() || '{}';
  return extractJsonFromText(rawText);
}

async function callOpenRouter(apiKey, modelName, mimeType, base64Data) {
  const formattedPrompt = `${EXTRACTION_PROMPT}

You MUST return only a raw, valid JSON object strictly matching this format without any introductory or conversational text:
{
  "is_receipt": true,
  "invalid_reason": null,
  "date": "YYYY-MM-DD" or null,
  "payee": "Merchant / Store Name" or null,
  "tin": "000-000-000-000" or null,
  "address": "Store Address" or null,
  "invoiceNo": "Invoice / OR Number" or null,
  "category": "Repair Maintenance" | "De Minimis" | "Utilities" | "Subscription" | "Transportation" | "Miscellaneous" | "Gasoline" | "Representation" | "Pantry" | "Medicine/Office Others" | "Others",
  "remarks": "Summary of items" or null,
  "amount": 123.45 or null
}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://reesivoo.onrender.com',
      'X-Title': 'Reesivoo',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: formattedPrompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType || 'image/jpeg'};base64,${base64Data}`,
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter (${modelName}) HTTP ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error(`OpenRouter (${modelName}) returned empty response content`);
  }

  return extractJsonFromText(rawContent);
}

export async function extractReceiptData(filePath, mimeType) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;

  if (!geminiApiKey && !openRouterApiKey) {
    throw new Error('Neither GEMINI_API_KEY nor OPENROUTER_API_KEY is configured in server environment');
  }

  // Read file as base64
  const fileBuffer = fs.readFileSync(filePath);
  const base64Data = fileBuffer.toString('base64');

  const errors = [];

  // 1. Cascade through Gemini models first
  if (geminiApiKey) {
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    for (const model of GEMINI_CASCADE_MODELS) {
      try {
        console.log(`[OCR Engine] Attempting extraction with Gemini model: ${model}`);
        const rawJson = await callGemini(ai, model, mimeType, base64Data);
        const normalized = normalizeReceiptResponse(rawJson);
        console.log(`[OCR Engine] Successfully processed receipt with Gemini model: ${model}`);
        return normalized;
      } catch (err) {
        // If image is confirmed NOT a receipt, stop immediately and reject without burning credits
        if (err.isNotReceipt) {
          throw err;
        }
        console.warn(`[OCR Engine] Gemini model ${model} failed: ${err.message}. Trying next fallback...`);
        errors.push({ engine: 'gemini', model, error: err.message });
      }
    }
  }

  // 2. Cascade through OpenRouter free vision models if configured
  if (openRouterApiKey) {
    const openRouterModels = process.env.OPENROUTER_FALLBACK_MODELS
      ? process.env.OPENROUTER_FALLBACK_MODELS.split(',').map((m) => m.trim()).filter(Boolean)
      : DEFAULT_OPENROUTER_MODELS;

    for (const model of openRouterModels) {
      try {
        console.log(`[OCR Engine] Attempting extraction with OpenRouter model: ${model}`);
        const rawJson = await callOpenRouter(openRouterApiKey, model, mimeType, base64Data);
        const normalized = normalizeReceiptResponse(rawJson);
        console.log(`[OCR Engine] Successfully processed receipt with OpenRouter model: ${model}`);
        return normalized;
      } catch (err) {
        if (err.isNotReceipt) {
          throw err;
        }
        console.warn(`[OCR Engine] OpenRouter model ${model} failed: ${err.message}. Trying next fallback...`);
        errors.push({ engine: 'openrouter', model, error: err.message });
      }
    }
  }

  // 3. If all engines and models failed, construct quota exhaustion error
  console.error('[OCR Engine] All AI vision models and fallbacks failed:', errors);
  const exhaustionErr = new Error('All AI vision models are currently exhausted or unavailable.');
  exhaustionErr.isQuotaExhausted = true;
  exhaustionErr.details = errors;
  throw exhaustionErr;
}
