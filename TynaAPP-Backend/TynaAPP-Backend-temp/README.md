# API & Abonnements – Guide Front

## Authentification
- Token Sanctum : `POST /api/tokens` avec `email`, `password`, `token_name` (opt).
- Ajouter `Authorization: Bearer <token>` sur toutes les routes protégées (`auth:sanctum`).

## Vérification email
- `POST /api/email/verification-notification`
- `GET /api/email/verify/{id}/{hash}`

## Abonnements (Stripe Checkout)
`POST /api/subscriptions` (auth)

### Payloads
- Avec plan en base :
```json
{
  "plan_id": 1,
  "success_url": "https://example.com/success",
  "cancel_url": "https://example.com/cancel"
}
```
- Avec price Stripe direct :
```json
{
  "price_id": "price_xxx",
  "success_url": "https://example.com/success",
  "cancel_url": "https://example.com/cancel",
  "trial_days": 5,
  "allow_promotion_codes": true
}
```
Règles :
- Si `plan_id` fourni, on lit `stripe_price_id`, `trial_days`, `allow_promotion_codes` du plan.
- Sinon `price_id` requis → 422 `missing_price_id` si absent.
- URLs doivent être valides.

### Réponse 201
```json
{ "url": "<checkout_url>", "session_id": "<id>" }
```
Rediriger l’utilisateur vers `url`.

### Routes de retour & Webhook
- `GET /checkout/success` → texte: paiement réussi
- `GET /checkout/cancel` → texte: paiement annulé
- `POST /stripe/webhook` (Cashier) → configurer `STRIPE_WEBHOOK_SECRET` et le webhook Stripe

## Ressources protégées (auth:sanctum)
- Meetings : CRUD `/api/meetings`
- Meeting summaries : CRUD `/api/meeting-summaries`
- Chat messages : CRUD `/api/chat-messages`
- Transcripts : CRUD `/api/transcripts`
- Profiles : CRUD `/api/profiles`
- Users : CRUD `/api/users`

## Plans (admin Filament)
- Menu “Plans” : saisir `stripe_product_id`, `stripe_price_id`, `interval`, `amount` (cents), `currency`, `trial_days`, `allow_promotion_codes`, `active`, description.
- `stripe_price_id` est utilisé pour l’abonnement quand `plan_id` est passé.

## Exemples cURL
- Token :
```bash
curl -X POST http://localhost:8000/api/tokens \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret"}'
```

- Subscription avec plan_id :
```bash
curl -X POST http://localhost:8000/api/subscriptions \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"plan_id":1,"success_url":"https://example.com/success","cancel_url":"https://example.com/cancel"}'
```

- Subscription avec price_id :
```bash
curl -X POST http://localhost:8000/api/subscriptions \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"price_id":"price_xxx","success_url":"https://example.com/success","cancel_url":"https://example.com/cancel","trial_days":5,"allow_promotion_codes":true}'
```
## Pré-requis Stripe
- `.env` : `STRIPE_SECRET`, `STRIPE_KEY`, `STRIPE_WEBHOOK_SECRET` (si webhook).
- Créer produits/prices dans Stripe, renseigner `stripe_price_id` dans Filament Plans.
- Serveur : `php artisan serve`.

# TynaAPP-Backend
# TynaBakend
# TynaAPP-Backend
