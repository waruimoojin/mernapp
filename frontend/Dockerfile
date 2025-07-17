# Frontend Dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copier les fichiers package.json
COPY package*.json ./

# Installer les dépendances
RUN npm ci

# Copier le code source
COPY . .

# Build l'application
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Copier les fichiers buildés
COPY --from=builder /app/build /usr/share/nginx/html

# Copier la configuration nginx personnalisée (optionnel)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exposer le port
EXPOSE 80

# Commande de démarrage
CMD ["npm", "start"]