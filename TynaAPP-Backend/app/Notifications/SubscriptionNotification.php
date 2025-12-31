<?php

namespace App\Notifications;

use App\Models\EmailSetting;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SubscriptionNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly string $plan)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $settings = EmailSetting::first();
        $subject = $settings->subscription_subject ?? 'Subscription confirmée';
        $body = $settings->subscription_body;

        return (new MailMessage)
            ->subject($subject)
            ->line("Bonjour {$notifiable->name},")
            ->line($body ?? "Votre souscription au plan {$this->plan} est confirmée.")
            ->line('Merci de votre confiance.');
    }
}
