-- Script SQL pour mettre à jour le plan Plus ($15/mois)
-- 
-- IMPORTANT: Remplacez 'price_XXXXX' par le vrai Price ID depuis Stripe Dashboard
-- 
-- Pour obtenir le Price ID:
-- 1. Allez sur https://dashboard.stripe.com
-- 2. Products → prod_The9T6xexlrGOj → Voir les prix
-- 3. Copiez le Price ID (commence par price_)
-- 4. Remplacez 'price_XXXXX' ci-dessous par le vrai Price ID

-- Mettre à jour ou créer le plan Plus
INSERT OR REPLACE INTO plans (
    id,
    name,
    stripe_product_id,
    stripe_price_id,
    interval,
    amount,
    currency,
    trial_days,
    allow_promotion_codes,
    description,
    active,
    created_at,
    updated_at
) VALUES (
    COALESCE((SELECT id FROM plans WHERE name = 'Plus' AND interval = 'month'), NULL),
    'Plus',
    'prod_The9T6xexlrGOj',
    'price_XXXXX',  -- ⚠️ REMPLACER par le vrai Price ID
    'month',
    1500,  -- $15.00 en cents
    'usd',
    7,  -- 7 jours d'essai
    1,  -- true (allow promotion codes)
    'For professionals who have frequent meetings.',
    1,  -- true (active)
    datetime('now'),
    datetime('now')
);

-- Vérifier que le plan a été créé/mis à jour
SELECT * FROM plans WHERE name = 'Plus';

