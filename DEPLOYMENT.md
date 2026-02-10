# Deployment Guide

## Prerequisites
- Node.js 16+ and npm
- MongoDB 4.4+
- Docker (optional, recommended for production)
- Nginx or Apache (for reverse proxy)

## Production Deployment

### 1. Environment Configuration

**Server (.env)**
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chillcast
JWT_SECRET=your-production-secret-key-min-32-chars-123456789
JWT_EXPIRE=7d
CORS_ORIGIN=https://www.chillcast.com
```

**Client (.env)**
```env
VITE_API_URL=https://api.chillcast.com
VITE_SOCKET_URL=https://api.chillcast.com
```

### 2. Build Frontend

```bash
cd client
npm run build
```

This creates an optimized production build in `client/dist/`.

### 3. Deploy Frontend

**Option A: Static Hosting (Vercel, Netlify)**
```bash
# Upload dist folder to your hosting service
# Or use CLI:
npm install -g vercel
vercel --prod
```

**Option B: Self-hosted with Nginx**
```bash
# Copy dist to server
scp -r client/dist/ user@server:/var/www/chillcast/

# Nginx config
server {
    listen 443 ssl http2;
    server_name chillcast.com;
    
    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;
    
    root /var/www/chillcast;
    index index.html;
    
    location / {
        try_files $uri /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
    
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
    }
}
```

### 4. Deploy Backend

**Option A: Docker**

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY server/package*.json ./
RUN npm ci --only=production

COPY server/src ./src

EXPOSE 5000
CMD ["node", "src/server.js"]
```

Build and push:
```bash
docker build -t chillcast-server .
docker push your-registry/chillcast-server
```

Deploy to Docker Compose:
```bash
docker-compose up -d
```

**Option B: Traditional Server (Ubuntu/Debian)**

```bash
# SSH to server
ssh user@server

# Clone repository
git clone https://github.com/yourusername/chillcast.git
cd chillcast/server

# Install dependencies
npm ci --only=production

# Install PM2
npm install -g pm2

# Start with PM2
pm2 start src/server.js --name "chillcast-api"
pm2 startup
pm2 save
```

### 5. MongoDB Setup

**Option A: MongoDB Atlas (Recommended)**
1. Create account at mongodb.com/cloud
2. Create cluster
3. Get connection string
4. Add to `.env` as `MONGODB_URI`

**Option B: Self-hosted MongoDB**
```bash
# Install MongoDB
sudo apt-get install mongodb

# Start service
sudo systemctl start mongodb

# Create database
mongo
> use chillcast
> db.createCollection("users")
```

### 6. SSL/TLS Certificate

Using Let's Encrypt with Certbot:
```bash
sudo apt-get install certbot python3-certbot-nginx

sudo certbot certonly --nginx -d chillcast.com -d api.chillcast.com

# Renew automatically
sudo systemctl enable certbot.timer
```

### 7. Monitoring & Logging

**Backend Logging:**
```bash
# View logs with PM2
pm2 logs chillcast-api

# Or with Docker
docker logs -f chillcast-server
```

**Set up application monitoring:**
```bash
pm2 install pm2-auto-pull
pm2 install pm2-logrotate
```

### 8. Performance Optimization

**Enable Gzip Compression (Nginx):**
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
```

**Enable Caching (Nginx):**
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

**Redis for Session Caching:**
```bash
npm install redis
```

### 9. Backup Strategy

**MongoDB Backup:**
```bash
# Daily backup
0 2 * * * mongodump --uri="mongodb://..." --out=/backups/chillcast-$(date +\%Y\%m\%d)

# Upload to S3
0 3 * * * aws s3 sync /backups s3://my-chillcast-backups/
```

### 10. CI/CD Pipeline

**.github/workflows/deploy.yml**
```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build frontend
        run: |
          cd client
          npm ci
          npm run build
      
      - name: Deploy frontend
        run: netlify deploy --prod --dir=client/dist
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
      
      - name: Deploy backend
        run: |
          ssh ${{ secrets.HOST }} << 'EOF'
          cd chillcast
          git pull
          cd server
          npm ci
          pm2 restart chillcast-api
          EOF
```

## Troubleshooting

### Connection Issues
```bash
# Test API connectivity
curl -X GET http://localhost:5000/health

# Test MongoDB
mongo mongodb+srv://user:pass@cluster.mongodb.net/test
```

### Socket.IO Issues
```bash
# Check WebSocket connection
curl -i http://localhost:5000/socket.io/?transport=websocket
```

### Memory Issues
```bash
# Increase Node.js memory limit
NODE_OPTIONS=--max-old-space-size=4096 node src/server.js
```

## Scaling

For large deployments:

1. **Load Balancing**: Use Nginx/HAProxy
2. **Database Sharding**: MongoDB sharding
3. **Redis Cache**: Session and rate limit storage
4. **CDN**: CloudFlare for static assets
5. **Microservices**: Separate auth, chat, rooms services
