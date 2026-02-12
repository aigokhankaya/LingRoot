# Simple Node.js container for Railway
# MFA runs on separate VDS, not in this container
FROM node:20-alpine

# Install ffmpeg for audio merging (fluent-ffmpeg requires system binary)
RUN apk add --no-cache ffmpeg

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

# Expose port
EXPOSE 5001

# Start application
CMD ["node", "server.js"]
