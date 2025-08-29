FROM node:22

WORKDIR /app


COPY package*.json ./
RUN npm install


COPY . .


# ENV NODE_ENV=production
ENV PORT=3000

# Expose port (your Express server port)
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
