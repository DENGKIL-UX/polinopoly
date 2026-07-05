import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

const SYSTEM_PROMPT = `You are the "Speaker of the Dewan Rakyat" in a satirical Malaysian political Monopoly game called "Dewan Rakyat: Pilihan Raya Edition". 

You control AI political coalition tokens. When asked about a property decision, you must respond with a strict JSON object:
{"action": "BUY" or "IGNORE", "quote": "<satirical Manglish/Malay quote>", "reasoning": "<brief logic>"}

Rules for decisions:
- BUY if the coalition would benefit (good location, affordable price, completes a color set)
- IGNORE if too expensive, already owns similar properties, or saving money
- Factor in the market data provided (KLCI, CPO, Ringgit) to influence decisions
- High inflation → BUY more (assets protect against inflation)
- Bad market → be more cautious with purchases

Quote style rules:
- Must be in Manglish (Malaysian English) or Malay
- Must be politically satirical and humorous
- Reference Malaysian political culture, food, or daily life
- Keep quotes SHORT (1-2 sentences max)
- Include common Manglish particles: "lah", "loh", "wei", "brader", "kan", "meh", "siap"
- Examples: "We buy lah, this one sure appreciate one!", "Cannot afford wei, economy bad lah now."

CRITICAL: You MUST respond with ONLY the JSON object. No other text before or after. No markdown. No code blocks.`;

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { coalitionId, coalitionName, property, money, ownedProperties, marketData } = body;

    if (!coalitionId || !property) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const zai = await getZAI();

    const userPrompt = `You are controlling ${coalitionName} (${coalitionId}).
    
Current situation:
- Property: "${property.name}" (Tile ${property.id}), Price: RM${property.price}, Base Rent: RM${property.rent?.[0] || 0}
- ${coalitionName} current money: RM${money}
- Properties already owned: ${ownedProperties.join(', ') || 'none'}
- Market: KLCI ${marketData.klci} (${marketData.klciChange > 0 ? '+' : ''}${marketData.klciChange}%), CPO RM${marketData.cpoPrice}, MYR/USD ${marketData.ringgitUsd}

Should ${coalitionName} BUY or IGNORE this property? Respond with JSON only.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      thinking: { type: 'disabled' },
    });

    const responseText = completion.choices[0]?.message?.content || '';

    // Parse the JSON response
    let result;
    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch {
      // Fallback if parsing fails
      result = {
        action: money >= (property.price || 0) ? 'BUY' : 'IGNORE',
        quote: `This ${property.name} one, ${money >= (property.price || 0) ? 'we take lah!' : 'too expensive already lah!'}`,
        reasoning: 'Fallback decision due to parse error',
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('AI Decision error:', error);
    return NextResponse.json({
      action: 'IGNORE',
      quote: 'AI system down lah, technical difficulty!',
      reasoning: 'API error',
    });
  }
}