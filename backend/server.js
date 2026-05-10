const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..')));

// Serve index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});

app.use('/api/ask-ai', limiter);

let genAI = null;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE') {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  console.log('[Server] Gemini AI initialized');
} else {
  console.warn('[Server] Gemini AI not configured - using fallback responses');
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), ai_available: !!genAI });
});

app.post('/api/ask-ai', async (req, res) => {
  try {
    const { question, context } = req.body;
    
    if (!question || question.trim().length === 0) {
      return res.status(400).json({ error: 'Question is required' });
    }
    
    if (!genAI) {
      const fallbackResponse = generateFallbackResponse(question, context);
      return res.json({ response: fallbackResponse });
    }
    
    const prompt = buildFinancialPrompt(question, context);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    res.json({ response: text });
  } catch (error) {
    console.error('[Server] AI error:', error);
    const fallbackResponse = generateFallbackResponse(req.body.question, req.body.context);
    res.json({ response: fallbackResponse });
  }
});

function buildFinancialPrompt(question, context) {
  const { paycheckAmount, totalSpent, totalAllocated, remainingBalance, rollbackPool, topSpendingCategories, savingsGoals, upcomingBillsCount, upcomingBillsTotal, payPeriod, totalBudgetPercentage } = context;
  
  let categoriesText = '';
  if (topSpendingCategories && topSpendingCategories.length > 0) {
    categoriesText = topSpendingCategories.map(c => `- ${c.name}: Spent $${c.spent.toFixed(2)} / Allocated $${c.allocated.toFixed(2)} (${c.percentUsed.toFixed(0)}% used)`).join('\n');
  }
  
  let savingsText = '';
  if (savingsGoals && savingsGoals.length > 0) {
    savingsText = savingsGoals.map(g => `- ${g.name}: ${g.progress.toFixed(0)}% complete, $${g.remaining.toFixed(2)} remaining`).join('\n');
  } else {
    savingsText = '- No savings goals configured yet';
  }
  
  return `You are a professional financial assistant for "Paycheck Balancer".

USER DATA:
- Paycheck: $${paycheckAmount?.toFixed(2) || 0} (${payPeriod || 'biweekly'})
- Budgeted: $${totalAllocated?.toFixed(2) || 0} (${totalBudgetPercentage?.toFixed(1) || 0}%)
- Spent: $${totalSpent?.toFixed(2) || 0}
- Remaining: $${remainingBalance?.toFixed(2) || 0}
- Rollback Pool: $${rollbackPool?.toFixed(2) || 0}
- Upcoming Bills: ${upcomingBillsCount || 0} bills totaling $${upcomingBillsTotal?.toFixed(2) || 0}

TOP SPENDING:
${categoriesText || '- No spending data'}

SAVINGS GOALS:
${savingsText}

USER QUESTION: "${question}"

Respond concisely (2-5 sentences) with specific numbers from their data. Be helpful and actionable.`;
}

function generateFallbackResponse(question, context) {
  const lowerQuestion = question.toLowerCase();
  const remaining = context?.remainingBalance || 0;
  const totalSpent = context?.totalSpent || 0;
  const allocated = context?.totalAllocated || 0;
  const paycheck = context?.paycheckAmount || 0;
  
  if (lowerQuestion.includes('balance') || lowerQuestion.includes('remaining')) {
    return `Your current remaining balance is $${remaining.toFixed(2)}. You have spent $${totalSpent.toFixed(2)} of your $${paycheck.toFixed(2)} paycheck for this period.`;
  }
  
  if (lowerQuestion.includes('spending') || lowerQuestion.includes('spent')) {
    const percentUsed = allocated > 0 ? (totalSpent / allocated) * 100 : 0;
    return `You have spent $${totalSpent.toFixed(2)} across your budget categories. This represents ${percentUsed.toFixed(0)}% of your allocated budget of $${allocated.toFixed(2)}.`;
  }
  
  if (lowerQuestion.includes('save') || lowerQuestion.includes('rollback')) {
    return `Your Rollback Pool contains $${(context?.rollbackPool || 0).toFixed(2)}. This accumulates unspent funds from previous pay periods. You can withdraw to your paycheck or allocate to savings goals.`;
  }
  
  if (lowerQuestion.includes('bill') || lowerQuestion.includes('upcoming')) {
    return `You have ${context?.upcomingBillsCount || 0} upcoming bills totaling $${(context?.upcomingBillsTotal || 0).toFixed(2)} for this period. Ensure you have sufficient remaining balance to cover these.`;
  }
  
  return `I can help analyze your finances. Try asking: "What is my remaining balance?", "How much have I spent?", "How can I save more?", or "Show my upcoming bills".`;
}

app.listen(PORT, () => {
  console.log(`[Server] Paycheck Balancer backend running on port ${PORT}`);
  console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;