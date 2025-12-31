<?php

namespace App\Notifications;

use App\Models\EmailSetting;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AccountValidationNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly string $verificationUrl)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $settings = EmailSetting::first();
        $subject = $settings->validation_subject ?? 'Validez votre compte';
        $body = $settings->validation_body;

        return (new MailMessage)
            ->subject($subject)
            ->line("Bonjour {$notifiable->name},")
            ->line($body ?? "Merci de vous être inscrit. Veuillez valider votre compte pour continuer.")
            ->action('Valider mon compte', $this->verificationUrl)
            ->line('Si vous n’êtes pas à l’origine de cette action, ignorez cet email.');
    }
}
