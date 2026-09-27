const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = __dirname;
const port = Number(process.env.PORT || 8787);
const dataFile = process.env.DATA_FILE || path.join(root, 'leaderboard.json');
const sessionTtl = 30 * 60 * 1000;
const sessions = new Map();
const completed = new Map();
const attempts = new Map();
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const quizData = JSON.parse(fs.readFileSync(path.join(root, 'data.json'), 'utf8'));
const questions = quizData.filter(item => item && Number.isInteger(item.id) && typeof item.name === 'string').map(item => ({ id: item.id, name: item.name }));

function json(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 20000) req.destroy(); });
    req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('invalid json')); } });
    req.on('error', reject);
  });
}
function shuffle(values) {
  const copy = values.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) { const j = crypto.randomInt(i + 1); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}
function publicQuestion(question) {
  const distractors = shuffle(questions.filter(item => item.id !== question.id)).slice(0, 3);
  return { id: question.id, prompt: `Quel est le nom de cette réaction ?`, options: shuffle([question, ...distractors]).map(item => ({ id: item.id, name: item.name })) };
}
function loadScores() {
  try { const parsed = JSON.parse(fs.readFileSync(dataFile, 'utf8')); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}
function saveScores(scores) {
  const tmp = `${dataFile}.tmp`;
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(scores, null, 2));
  fs.renameSync(tmp, dataFile);
}
function cleanName(value) {
  return typeof value === 'string' ? value.trim().replace(/[^\p{L}\p{N} _.-]/gu, '').slice(0, 20) : '';
}
function limited(ip) {
  const now = Date.now();
  const record = attempts.get(ip) || { at: now, count: 0 };
  if (now - record.at > 60 * 1000) { record.at = now; record.count = 0; }
  record.count += 1; attempts.set(ip, record);
  return record.count > 90;
}
function leaderboard() { return loadScores().sort((a, b) => b.score - a.score || a.createdAt - b.createdAt).slice(0, 25); }
function cleanup() { const cutoff = Date.now() - sessionTtl; for (const [token, session] of sessions) if (session.createdAt < cutoff) sessions.delete(token); for (const [token, result] of completed) if (result.createdAt < cutoff) completed.delete(token); }

const server = http.createServer(async (req, res) => {
  const ip = req.socket.remoteAddress || 'unknown';
  if (limited(ip)) return json(res, 429, { error: 'Trop de requêtes, réessayez dans un instant.' });
  cleanup();
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (req.method === 'GET' && url.pathname === '/api/leaderboard') return json(res, 200, { entries: leaderboard() });
    if (req.method === 'POST' && url.pathname === '/api/quiz/start') {
      const token = crypto.randomBytes(24).toString('base64url');
      const ordered = shuffle(questions).slice(0, Math.min(20, questions.length));
      sessions.set(token, { createdAt: Date.now(), questions: ordered, index: 0, score: 0, misses: 0 });
      return json(res, 200, { token, total: ordered.length, question: publicQuestion(ordered[0]) });
    }
    if (req.method === 'POST' && url.pathname === '/api/quiz/answer') {
      const body = await readBody(req);
      const session = sessions.get(body.token);
      if (!session || Date.now() - session.createdAt > sessionTtl) return json(res, 401, { error: 'Session expirée.' });
      const current = session.questions[session.index];
      if (!current || !Number.isInteger(body.answerId)) return json(res, 400, { error: 'Réponse invalide.' });
      const correct = body.answerId === current.id;
      if (correct) session.score += 1; else session.misses += 1;
      session.index += 1;
      const done = session.index >= session.questions.length;
      const response = { correct, score: session.score, misses: session.misses, done };
      if (done) { sessions.delete(body.token); const completionToken = crypto.randomBytes(24).toString('base64url'); completed.set(completionToken, { createdAt: Date.now(), score: session.score, total: session.questions.length }); response.total = session.questions.length; response.completionToken = completionToken; } else response.question = publicQuestion(session.questions[session.index]);
      return json(res, 200, response);
    }
    if (req.method === 'POST' && url.pathname === '/api/leaderboard') {
      const body = await readBody(req);
      const name = cleanName(body.name);
      const score = Number(body.score);
      const total = Number(body.total);
      const verified = completed.get(body.completionToken);
      if (!name || !verified || !Number.isInteger(score) || !Number.isInteger(total) || score !== verified.score || total !== verified.total) return json(res, 400, { error: 'Résultat invalide ou session expirée.' });
      completed.delete(body.completionToken);
      const scores = loadScores();
      scores.push({ name, score, total, createdAt: Date.now() });
      saveScores(scores.sort((a, b) => b.score - a.score || a.createdAt - b.createdAt).slice(0, 500));
      return json(res, 201, { entries: leaderboard() });
    }
    if (req.method === 'GET') {
      const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
      const file = path.resolve(root, `.${pathname}`);
      if (!file.startsWith(path.resolve(root)) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return json(res, 404, { error: 'Introuvable.' });
      res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
      return fs.createReadStream(file).pipe(res);
    }
    return json(res, 404, { error: 'Introuvable.' });
  } catch (error) { return json(res, 400, { error: error.message === 'invalid json' ? 'JSON invalide.' : 'Erreur serveur.' }); }
});
server.listen(port, () => process.stdout.write(`Réactions server listening on ${port}\n`));
