const suggestionsRoutes = require('./routes/suggestions');
app.use('/suggestions', suggestionsRoutes);

app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
}); 