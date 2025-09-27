const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const offersRouter = require('./routes/offers');
const reservationsRouter = require('./routes/reservations');
const adminRouter = require('./routes/admin');

const app = express();

app.use(cors());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/offers', offersRouter);
app.use('/reservations', reservationsRouter);
app.use('/admin', adminRouter);

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
