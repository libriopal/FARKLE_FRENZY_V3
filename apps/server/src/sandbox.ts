import { Router } from 'express';
import { analyzeRTPImpact } from '@farkle/ai';
import { validatePatch } from '@farkle/ai';

const router = Router();

// Mock Monte Carlo simulation for sandbox
// In a real implementation, this would call the actual engine
async function runMonteCarloSimulation(patch: any, sessions: number) {
  // Simulate some processing time
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Generate semi-random but plausible results based on the patch
  const baseScore = 4500;
  const baseFarkleRate = 0.15;
  
  // Add some noise
  const scoreNoise = (Math.random() * 400) - 200;
  const farkleNoise = (Math.random() * 0.04) - 0.02;
  
  return {
    avgScore: Math.round(baseScore + scoreNoise),
    farkleRate: Number((baseFarkleRate + farkleNoise).toFixed(3)),
    multiplierDistribution: {
      "x1_0": 0.45,
      "x1_25": 0.25,
      "x1_5": 0.15,
      "x2_0": 0.10,
      "x3_0": 0.04,
      "x4_0": 0.01
    },
    sessionsRun: sessions
  };
}

router.post('/simulate', async (req, res) => {
  try {
    const { patch, sessions = 4000 } = req.body;
    
    if (!patch) {
      return res.status(400).json({ error: 'Patch data is required' });
    }
    
    const results = await runMonteCarloSimulation(patch, sessions);
    
    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({ error: 'Simulation failed' });
  }
});

router.post('/analyze', async (req, res) => {
  try {
    const { input } = req.body;
    
    if (!input) {
      return res.status(400).json({ error: 'Analysis input is required' });
    }
    
    const analysis = await analyzeRTPImpact(input);
    
    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

router.post('/validate-patch', (req, res) => {
  try {
    const { patch } = req.body;
    
    if (!patch) {
      return res.status(400).json({ error: 'Patch data is required' });
    }
    
    const validation = validatePatch(patch);
    
    res.json({
      success: true,
      validation
    });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ error: 'Validation failed' });
  }
});

router.get('/health', (req, res) => {
  res.json({ 
    ok: true,
    aiAvailable: !!process.env.GEMINI_API_KEY
  });
});

export const sandboxRouter = router;
