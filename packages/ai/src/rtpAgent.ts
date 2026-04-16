import { GoogleGenerativeAI } from '@google/generative-ai';

export interface RTPAnalysisInput {
  patchName: string;
  patchDescription: string;
  baselineRTP: number;
  simulationResults: {
    avgScore: number;
    farkleRate: number;
    multiplierDistribution: Record<string, number>;
    sessionsRun: number;
  };
  spawnWeightAdjustments: Record<string, number>;
}

export interface RTPAnalysisOutput {
  analysis: string;
  recommendations: string[];
  projectedRTP: number;
  projectedRTPRange: [number, number];
  riskLevel: 'low' | 'medium' | 'high';
  approved: boolean;
}

export const RTP_ACCEPTABLE_RANGE = { min: 0.80, max: 1.05 } as const;

export async function analyzeRTPImpact(
  input: RTPAnalysisInput
): Promise<RTPAnalysisOutput> {
  const systemInstruction = `You are an RTP analysis engine for Farkle Frenzy. Return ONLY JSON:
{"analysis": "string", "recommendations": ["string"], "projectedRTP": 0, "projectedRTPRange": [0, 0], "riskLevel": "low", "approved": true}
Projected RTP must include spawn adjustments. Approved if 0.80-1.05.`;

  const userPrompt = `Patch: ${input.patchName} Description: ${input.patchDescription} Baseline RTP: ${input.baselineRTP}
Simulation (${input.simulationResults.sessionsRun} sessions):
Avg Score: ${input.simulationResults.avgScore}
Farkle Rate: ${input.simulationResults.farkleRate * 100}%
Multiplier distribution: ${JSON.stringify(input.simulationResults.multiplierDistribution)}
Spawn weight adjustments: ${JSON.stringify(input.spawnWeightAdjustments)}
Analyze RTP impact and return JSON only.`;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      systemInstruction
    });
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }]
    });

    const content = result.response.text();
    
    const jsonStr = content.replace(/^\s*```json\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    return JSON.parse(jsonStr) as RTPAnalysisOutput;
  } catch (error) {
    console.error('RTP Analysis failed:', error);
    return {
      analysis: "Analysis unavailable",
      recommendations: [],
      projectedRTP: input.baselineRTP,
      projectedRTPRange: [0.8, 1.05],
      riskLevel: "high",
      approved: false
    };
  }
}
