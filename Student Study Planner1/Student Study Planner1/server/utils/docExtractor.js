const path = require('path');

async function extractText(buffer, originalname) {
  const ext = path.extname(originalname).toLowerCase();
  
  if (ext === '.pdf') {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    return { text: data.text, pages: data.numpages, type: 'PDF' };
  }
  
  if (['.docx', '.doc'].includes(ext)) {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value, pages: null, type: 'Word Document' };
  }
  
  if (ext === '.pptx') {
    const JSZip = require('jszip');
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files)
      .filter(f => /ppt\/slides\/slide\d+\.xml/.test(f))
      .sort((a, b) => parseInt(a.match(/slide(\d+)/)[1]) - parseInt(b.match(/slide(\d+)/)[1]));
    let allText = '';
    for (const sf of slideFiles) {
      const xml = await zip.files[sf].async('string');
      const matches = xml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) || [];
      const st = matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
      if (st.trim()) allText += '\n\n--- Slide ' + sf.match(/slide(\d+)/)[1] + ' ---\n' + st;
    }
    return { text: allText.trim(), pages: slideFiles.length, type: 'PowerPoint' };
  }
  
  if (['.txt', '.md', '.json', '.js', '.py', '.java', '.cpp', '.c', '.html', '.css'].includes(ext)) {
    return { text: buffer.toString('utf-8'), pages: null, type: ext === '.md' ? 'Markdown' : 'Text' };
  }
  
  throw new Error(`Unsupported document format "${ext}". Please upload PDF, Word (DOCX), PowerPoint (PPTX), or plain text.`);
}

module.exports = { extractText };
