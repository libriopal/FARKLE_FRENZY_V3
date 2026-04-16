import express from 'express';
import { sandboxRouter } from './sandbox';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/sandbox', sandboxRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
