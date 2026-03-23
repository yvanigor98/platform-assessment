import express from 'express';
import { register, Counter, Histogram, collectDefaultMetrics } from 'prom-client';
import winston from 'winston';

// Structured JSON logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

const app = express();
const PORT = process.env.PORT || 3000;

// Collect default system metrics
collectDefaultMetrics();

// Counter - tracks total number of HTTP requests
const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

// Histogram - tracks how long each request takes
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
});

// Middleware - runs on every request to record metrics and log
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    httpRequestCounter.inc({
      method: req.method,
      route: req.path,
      status: res.statusCode,
    });
    end({ method: req.method, route: req.path, status: res.statusCode });
    // Structured JSON log for every request
    logger.info('HTTP Request', {
      method: req.method,
      route: req.path,
      status: res.statusCode,
      duration_ms: Date.now(),
    });
  });
  next();
});

// Route 1 - main endpoint
app.get('/', (req, res) => {
  logger.info('Root endpoint called');
  res.json({ message: 'Hello from Platform Engineer!' });
});

// Route 2 - health check for Kubernetes liveness and readiness probes
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Route 3 - exposes Prometheus metrics for scraping
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(PORT, () => {
  logger.info(`Server started`, { port: PORT });
});