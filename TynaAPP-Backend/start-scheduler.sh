#!/bin/bash

# Script pour démarrer le scheduler Laravel en arrière-plan
# Le scheduler doit tourner en continu pour exécuter les tâches automatiques

cd "$(dirname "$0")"

echo "🔄 Démarrage du scheduler Laravel..."
echo "📋 Le scheduler va synchroniser automatiquement les données Supabase toutes les 5 minutes"
echo ""
echo "⚠️  Appuyez sur Ctrl+C pour arrêter le scheduler"
echo ""

# Démarrer le scheduler
/Applications/XAMPP/xamppfiles/bin/php artisan schedule:work

