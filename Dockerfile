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
RUN npm run build:deploy-root

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy the build output to Nginx's default public folder
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
