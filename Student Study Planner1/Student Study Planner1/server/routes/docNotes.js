const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticateToken } = require('../middleware/authMiddleware');
const { chatWithClaude } = require('../services/claudeService');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExt = ['.pdf', '.docx', '.doc', '.pptx', '.ppt', '.txt', '.md'];
    if (allowedExt.includes(ext)) cb(null, true);
    else cb(new Error('Unsupported file type: ' + ext));
  }
});

const { extractText } = require('../utils/docExtractor');

router.post('/generate', authenticateToken, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No document uploaded.' });
    const { buffer, originalname, size } = req.file;
    const { provider, apiKey, model, note_title } = req.body;
    let extracted;
    try { extracted = await extractText(buffer, originalname); }
    catch (e) { return res.status(422).json({ error: e.message }); }
    if (!extracted.text || extracted.text.trim().length < 30)
      return res.status(422).json({ error: 'Could not extract readable text. Use a text-based PDF or DOCX.' });
    const MAX_TEXT = 14000;
    const snippet = extracted.text.length > MAX_TEXT ? extracted.text.slice(0, MAX_TEXT) + '\n\n[...truncated for processing...]' : extracted.text;
    const docTitle = note_title || path.basename(originalname, path.extname(originalname));
    const prompt = `You are an expert academic tutor. I uploaded a ${extracted.type} titled: "${docTitle}".

Extracted document content:
---
${snippet}
---

Generate comprehensive, well-structured study notes from this document using the following format:

# 📚 Study Notes: ${docTitle}

## 📋 Executive Summary
(Write 2-3 clear paragraphs summarizing the main themes, findings, and arguments)

## 🔑 Key Concepts & Definitions
(List all major concepts, definitions, equations, and terms with clear, beginner-friendly explanations)

## 📖 Detailed Topic Breakdown
(Thorough explanation of each section/topic with structured sub-points and bullet points)

## 💡 Important Highlights & Exam Tips
(Crucial points to memorize, common pitfalls, and potential exam questions)

## 🧠 Quick Review Flashcards
(Create 5-6 high-yield Question & Answer pairs based on this document)
- **Q:** [Question]
  **A:** [Answer]

Ensure high readability, clear Markdown headers, bold terms, and academic precision.`;

    const result = await chatWithClaude({
      messages: [{ role: 'user', content: prompt }],
      courseContext: 'Document: ' + docTitle,
      provider: provider || 'gemini',
      apiKey: apiKey || process.env.GEMINI_API_KEY,
      model: model || process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
    });

    res.json({
      success: true,
      title: docTitle,
      fileType: extracted.type,
      pages: extracted.pages,
      fileSizeKb: Math.round(size / 1024),
      charCount: extracted.text.length,
      notes: result.reply,
      model: result.model,
      generatedAt: new Date().toISOString()
    });
 } catch (err) {
 console.error('[DocNotes]', err.message);
 res.status(500).json({ error: err.message || 'Failed to generate notes from document.' });
 }
});

router.use((err, req, res, next) => {
 if (err instanceof multer.MulterError || err.message?.includes('Unsupported'))
 return res.status(400).json({ error: err.message });
 next(err);
});

module.exports = router;
