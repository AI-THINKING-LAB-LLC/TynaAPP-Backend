<?php

namespace App\Notifications;

use App\Models\EmailSetting;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class WelcomeNotification extends Notification
{
    use Queueable;

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $settings = EmailSetting::first();
        $subject = $settings->welcome_subject ?? 'Bienvenue !';
        $body = $settings->welcome_body;

        return (new MailMessage)
            ->subject($subject)
            ->line("Bonjour {$notifiable->name},")
            ->line($body ?? 'Votre compte est maintenant validé. Bienvenue parmi nous !')
            ->line('Vous pouvez dès à présent utiliser la plateforme.');
    }
}
