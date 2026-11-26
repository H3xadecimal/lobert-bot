FROM node:22-alpine
WORKDIR /app

# Install everything, including ts-node
COPY package*.json ./
RUN npm install

# Copy your source
COPY . .

# Compile source rather than relying on checked-in build output
RUN npm run build

# Start the bot
CMD ["npm", "start"]