#!/bin/bash

# Script pour ajouter les clés Stripe au fichier .env

ENV_FILE=".env"

# Vérifier si le fichier .env existe
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Le fichier .env n'existe pas!"
    exit 1
fi

# Vérifier si les clés Stripe existent déjà
if grep -q "^STRIPE_KEY=" "$ENV_FILE"; then
    echo "⚠️  Les clés Stripe existent déjà dans .env"
    echo "Voulez-vous les remplacer? (y/n)"
    read -r response
    if [ "$response" != "y" ]; then
        echo "Annulé."
        exit 0
    fi
    # Supprimer les anciennes clés
    sed -i.bak '/^STRIPE_KEY=/d' "$ENV_FILE"
    sed -i.bak '/^STRIPE_SECRET=/d' "$ENV_FILE"
    sed -i.bak '/^STRIPE_WEBHOOK_SECRET=/d' "$ENV_FILE"
fi

# Ajouter les clés Stripe à la fin du fichier
# IMPORTANT: Remplacez les valeurs par vos vraies clés Stripe
echo "" >> "$ENV_FILE"
echo "# Stripe Configuration (Live/Production)" >> "$ENV_FILE"
echo "# Remplacez les valeurs ci-dessous par vos vraies clés Stripe" >> "$ENV_FILE"
echo "STRIPE_KEY=pk_live_YOUR_PUBLISHABLE_KEY_HERE" >> "$ENV_FILE"
echo "STRIPE_SECRET=sk_live_YOUR_SECRET_KEY_HERE" >> "$ENV_FILE"
echo "STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE" >> "$ENV_FILE"

echo "✅ Clés Stripe ajoutées avec succès dans .env"
echo ""
echo "⚠️  IMPORTANT:"
echo "1. Vous devez récupérer les Price IDs depuis Stripe Dashboard"
echo "2. Ajoutez les Price IDs dans les plans via Filament Admin"
echo "3. Le Product ID fourni est: prod_The9T6xexlrGOj"
echo ""
echo "Voir STRIPE_CONFIGURATION.md pour plus de détails."

