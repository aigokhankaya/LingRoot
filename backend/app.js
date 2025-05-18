app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
}); 