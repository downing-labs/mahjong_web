# Stage 1: Build the Angular app
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies
COPY package*.json ./
# The project has a local builder in tools/builders
COPY tools ./tools
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx (unprivileged)
FROM nginxinc/nginx-unprivileged:alpine

# Copy the build output to Nginx's default public folder
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
