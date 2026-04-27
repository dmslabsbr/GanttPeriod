# Stage 1: Build the React application
FROM node:20-slim AS build
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:stable-alpine
# Copy the build output from Stage 1 to Nginx's serve directory
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
