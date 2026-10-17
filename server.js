const express = require('express');
const path = require('path');
const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public'), { dotfiles: 'allow' }));

const GROQ = 'https://api.groq.com/openai/v1';
const PREFERRED = [
  process.env.GROQ_MODEL,
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b'
].filter(Boolean);

let cache = { at: 0, ids: [] };
async function availableModels() {
  if (Date.now() - cache.at < 10 * 60 * 1000 && cache.ids.length) return cache.ids;
  const r = await fetch(GROQ + '/models', {
    headers: { Authorization: 'Bearer ' + process.env.GROQ_API_KEY }
  });
  const d = await r.json();
  if (!r.ok) throw new Error((d.error && d.error.message) || 'Model listesi alınamadı');
  cache = {
    at: Date.now(),
    ids: d.data
      .filter(m => m.active !== false)
      .map(m => m.id)
      .filter(id => !/whisper|guard|tts|orpheus|embed/i.test(id))
  };
  return cache.ids;
}

async function pickModel(requested) {
  const ids = await availableModels();
  if (requested && ids.includes(requested)) return requested;
  return PREFERRED.find(m => ids.includes(m)) || ids[0];
}

app.post('/api/chat', async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY)
      return res.status(500).json({ error: 'GROQ_API_KEY Render ortam değişkenlerine eklenmemiş.' });
    const { messages, model } = req.body;
    const chosen = await pickModel(model);
    if (!chosen) return res.status(500).json({ error: 'Kullanılabilir model bulunamadı.' });

    const r = await fetch(GROQ + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.GROQ_API_KEY },
      body: JSON.stringify({ model: chosen, messages, temperature: 0.7, max_tokens: 500 })
    });
    const d = await r.json();
    if (!r.ok) {
      cache.at = 0; // sonraki istekte model listesini yenile
      return res.status(r.status).json({ error: (d.error && d.error.message) || 'Groq hatası' });
    }
    res.json({ reply: d.choices[0].message.content, model: chosen });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(process.env.PORT || 3000, () => console.log('Katia çalışıyor'));
