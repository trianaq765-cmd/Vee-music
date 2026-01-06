FROM node:20-slim

# Install dependencies untuk audio
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    build-essential \
    libsodium-dev \
    libtool \
    autoconf \
    automake \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install node modules
RUN npm install --production

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start bot
CMD ["node", "index.js"]
