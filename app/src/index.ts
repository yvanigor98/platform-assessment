import express from 'express';
import { register, Counter, Histogram, collectDefaultMetrics } from 'prom-client';

const app = express();
const PORT = process.env.PORT || 3000;

// Collect default system metrics (CPU, memory, event loop lag etc)
collectDefaultMetrics();

// Counter - tracks total number of HTTP requests (counts how many requests hit each route. Good for alerting on error rates)
const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

// Histogram - tracks how long each request takes (Good for detecting slow endpoints)
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
});

// Middleware - runs on every request to record metrics
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    httpRequestCounter.inc({
      method: req.method,
      route: req.path,
      status: res.statusCode,
    });
    end({ method: req.method, route: req.path, status: res.statusCode });
  });
  next();
});

// Route 1 - main endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Hello from Platform Engineer!' });
});

// Route 2 - health check for Kubernetes liveness and readiness probes (kubernetes calls this to know if the pod is alive and ready to serve traffic)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Route 3 - exposes Prometheus metrics for scraping (prometheus scrapes this endpoint to collect all our metrics)
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});