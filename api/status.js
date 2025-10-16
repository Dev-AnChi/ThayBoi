export default function handler(req, res) {
  res.json({ 
    status: 'ok',
    message: 'Vercel API is working!',
    timestamp: new Date().toISOString()
  });
}
