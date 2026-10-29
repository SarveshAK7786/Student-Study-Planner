const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { authenticateToken } = require('../middleware/authMiddleware');
const { 
  chatWithClaude, 
  callGemini, 
  callOpenAI, 
  callClaude 
} = require('../services/claudeService');

// Get active AI configuration status
router.get('/config', authenticateToken, (req, res) => {
  res.json({
    providers: {
      gemini: {
        name: 'Google Gemini',
        configured: Boolean(process.env.GEMINI_API_KEY),
        defaultModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        keyUrl: 'https://aistudio.google.com/app/apikey'
      },
      openai: {
        name: 'ChatGPT (OpenAI)',
        configured: Boolean(process.env.OPENAI_API_KEY),
        defaultModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        keyUrl: 'https://platform.openai.com/api-keys'
      },
      claude: {
        name: 'Anthropic Claude',
        configured: Boolean(process.env.ANTHROPIC_API_KEY),
        defaultModel: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet',
        keyUrl: 'https://console.anthropic.com/'
      },
      free: {
        name: 'Free Real AI (Zero-Key)',
        configured: true,
        defaultModel: 'GPT-OSS 20B (OpenAI)',
        keyUrl: null
      }
    },
    defaultProvider: process.env.DEFAULT_AI_PROVIDER || 'free'
  });
});

// Save API key to server environment
router.post('/save-key', authenticateToken, async (req, res) => {
  try {
    const { provider, apiKey, model } = req.body;
    if (!provider) {
      return res.status(400).json({ error: 'Provider is required.' });
    }

    const envPath = path.resolve(__dirname, '../.env');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

    const keyMap = {
      gemini: 'GEMINI_API_KEY',
      openai: 'OPENAI_API_KEY',
      claude: 'ANTHROPIC_API_KEY'
    };

    const envKey = keyMap[provider];
    if (envKey && apiKey !== undefined) {
      process.env[envKey] = apiKey.trim();

      const regex = new RegExp(`^${envKey}=.*$`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${envKey}=${apiKey.trim()}`);
      } else {
        envContent += `\n${envKey}=${apiKey.trim()}`;
      }
    }

    if (model) {
      const modelMap = {
        gemini: 'GEMINI_MODEL',
        openai: 'OPENAI_MODEL',
        claude: 'CLAUDE_MODEL'
      };
      const modelEnvKey = modelMap[provider];
      if (modelEnvKey) {
        process.env[modelEnvKey] = model.trim();
        const modelRegex = new RegExp(`^${modelEnvKey}=.*$`, 'm');
        if (modelRegex.test(envContent)) {
          envContent = envContent.replace(modelRegex, `${modelEnvKey}=${model.trim()}`);
        } else {
          envContent += `\n${modelEnvKey}=${model.trim()}`;
        }
      }
    }

    fs.writeFileSync(envPath, envContent, 'utf8');

    res.json({
      message: `API Key for ${provider} saved successfully!`,
      provider,
      configured: Boolean(apiKey)
    });
  } catch (err) {
    console.error('Error saving API key:', err);
    res.status(500).json({ error: 'Failed to persist API key.' });
  }
});

// Test connection for a provider
router.post('/test-connection', authenticateToken, async (req, res) => {
  try {
    const { provider, apiKey, model } = req.body;
    const testMessages = [{ role: 'user', content: 'Say "Connection successful" in 2 words.' }];

    let testResult;
    const startTime = Date.now();

    if (provider === 'gemini') {
      testResult = await callGemini({ apiKey, messages: testMessages, model });
    } else if (provider === 'openai') {
      testResult = await callOpenAI({ apiKey, messages: testMessages, model });
    } else if (provider === 'claude') {
      testResult = await callClaude({ apiKey, messages: testMessages, model });
    } else {
      return res.json({ success: true, message: 'Free Real AI is ready immediately!', latencyMs: 0 });
    }

    const latencyMs = Date.now() - startTime;
    res.json({
      success: true,
      message: `Connected successfully to ${testResult.model}!`,
      latencyMs,
      sample: testResult.reply
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// Send message to AI Study Assistant
router.post('/message', authenticateToken, async (req, res) => {
  try {
    const { 
      messages = [], 
      active_course_id, 
      provider, 
      apiKey, 
      model 
    } = req.body;

    if (!messages || messages.length === 0) {
      return res.status(400).json({ error: 'Message history is required.' });
    }

    // Load active course context if student provided
    let courseContext = '';
    if (active_course_id) {
      const course = await db.get(`SELECT name, description FROM courses WHERE id = ?`, [active_course_id]);
      if (course) {
        courseContext = `Subject: ${course.name}. Details: ${course.description || 'Core syllabus'}.`;
      }
    } else {
      const courses = await db.query(`SELECT name FROM courses WHERE user_id = ? LIMIT 3`, [req.user.id]);
      if (courses && courses.length > 0) {
        courseContext = `Enrolled subjects: ${courses.map(c => c.name).join(', ')}.`;
      }
    }

    const replyData = await chatWithClaude({
      messages,
      courseContext,
      provider,
      apiKey,
      model
    });

    res.json({
      role: 'assistant',
      content: replyData.reply,
      model: replyData.model,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('AI Chatbot error:', err);
    res.status(500).json({ error: 'Failed to process AI chat query.' });
  }
});

module.exports = router;
