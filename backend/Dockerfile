# Multi-stage build for MFA integration
FROM node:20-alpine AS base

# Install system dependencies for MFA
RUN apk add --no-cache \
    python3 \
    py3-pip \
    gcc \
    g++ \
    make \
    linux-headers \
    musl-dev \
    python3-dev

# Install MFA (--break-system-packages for PEP 668 compatibility)
RUN pip3 install --no-cache-dir --break-system-packages montreal-forced-aligner

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV USE_MFA_ALIGNMENT=true

# Expose port
EXPOSE 5001

# Start application
CMD ["node", "server.js"]
