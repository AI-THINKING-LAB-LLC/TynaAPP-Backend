#!/bin/bash

# Script pour démarrer les serveurs Laravel et Frontend
# Usage: ./start-servers.sh

echo "🚀 Démarrage des serveurs pour tester la migration Laravel..."
echo ""

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier si PHP est installé
if ! command -v php &> /dev/null; then
    echo -e "${YELLOW}⚠️  PHP n'est pas installé ou pas dans le PATH${NC}"
    echo "   Installez PHP 8.2+ pour continuer"
    exit 1
fi

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  Node.js n'est pas installé${NC}"
    echo "   Installez Node.js 20+ pour continuer"
    exit 1
fi

# Vérifier la configuration .env pour Laravel
if [ ! -f "TynaAPP-Backend/.env" ]; then
    echo -e "${YELLOW}⚠️  Fichier .env manquant dans TynaAPP-Backend/${NC}"
    echo "   Création depuis .env.example..."
    if [ -f "TynaAPP-Backend/.env.example" ]; then
        cp TynaAPP-Backend/.env.example TynaAPP-Backend/.env
        echo -e "${GREEN}✅ Fichier .env créé${NC}"
        echo -e "${YELLOW}⚠️  N'oubliez pas de configurer les variables d'environnement !${NC}"
    else
        echo -e "${YELLOW}⚠️  .env.example non trouvé. Créez manuellement le fichier .env${NC}"
    fi
fi

# Vérifier la configuration .env.local pour le frontend
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}⚠️  Fichier .env.local manquant${NC}"
    echo "   Création depuis env.example..."
    if [ -f "env.example" ]; then
        cp env.example .env.local
        echo -e "${GREEN}✅ Fichier .env.local créé${NC}"
        echo -e "${YELLOW}⚠️  Configurez VITE_LARAVEL_BACKEND_URL dans .env.local${NC}"
    fi
fi

# Vérifier si les dépendances sont installées
if [ ! -d "TynaAPP-Backend/vendor" ]; then
    echo -e "${BLUE}📦 Installation des dépendances Laravel...${NC}"
    cd TynaAPP-Backend
    composer install
    cd ..
fi

if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installation des dépendances Frontend...${NC}"
    npm install
fi

# Générer la clé Laravel si nécessaire
if ! grep -q "APP_KEY=base64:" TynaAPP-Backend/.env 2>/dev/null; then
    echo -e "${BLUE}🔑 Génération de la clé Laravel...${NC}"
    cd TynaAPP-Backend
    php artisan key:generate
    cd ..
fi

echo ""
echo -e "${GREEN}✅ Configuration vérifiée${NC}"
echo ""
echo -e "${BLUE}🌐 Démarrage du serveur Laravel sur http://localhost:8001${NC}"
echo -e "${BLUE}🌐 Démarrage du serveur Frontend sur http://localhost:5173${NC}"
echo ""
echo -e "${YELLOW}⚠️  Les serveurs vont démarrer dans des terminaux séparés${NC}"
echo -e "${YELLOW}⚠️  Appuyez sur Ctrl+C dans chaque terminal pour arrêter${NC}"
echo ""

# Fonction pour nettoyer les processus à la sortie
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Arrêt des serveurs...${NC}"
    pkill -f "php artisan serve" 2>/dev/null
    pkill -f "vite" 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Démarrer Laravel en arrière-plan
echo -e "${GREEN}🚀 Démarrage Laravel...${NC}"
cd TynaAPP-Backend
php artisan serve --port=8001 --host=127.0.0.1 > ../laravel.log 2>&1 &
LARAVEL_PID=$!
cd ..

# Attendre un peu que Laravel démarre
sleep 2

# Démarrer Vite en arrière-plan
echo -e "${GREEN}🚀 Démarrage Frontend (Vite)...${NC}"
npm run dev > vite.log 2>&1 &
VITE_PID=$!

echo ""
echo -e "${GREEN}✅ Serveurs démarrés !${NC}"
echo ""
echo -e "${BLUE}📊 URLs:${NC}"
echo -e "   Backend Laravel:  ${GREEN}http://localhost:8001${NC}"
echo -e "   Frontend:         ${GREEN}http://localhost:5173${NC}"
echo -e "   API Laravel:      ${GREEN}http://localhost:8001/api${NC}"
echo ""
echo -e "${BLUE}📝 Logs:${NC}"
echo -e "   Laravel:  tail -f laravel.log"
echo -e "   Vite:     tail -f vite.log"
echo ""
echo -e "${YELLOW}💡 Pour arrêter les serveurs:${NC}"
echo -e "   kill $LARAVEL_PID $VITE_PID"
echo ""

# Attendre que l'utilisateur appuie sur Ctrl+C
wait

