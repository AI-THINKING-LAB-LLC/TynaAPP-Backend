<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class UserChangedNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly string $action)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $subject = match ($this->action) {
            'created' => 'Votre compte a été créé',
            'updated' => 'Votre compte a été mis à jour',
            'deleted' => 'Votre compte a été supprimé',
            default => 'Mise à jour du compte',
        };

        $line = match ($this->action) {
            'created' => "Bonjour {$notifiable->name}, votre compte a été créé avec l'email {$notifiable->email}.",
            'updated' => "Bonjour {$notifiable->name}, les informations de votre compte ont été mises à jour.",
            'deleted' => "Bonjour {$notifiable->name}, votre compte a été supprimé.",
            default => "Bonjour {$notifiable->name}, une mise à jour a été réalisée sur votre compte.",
        };

        return (new MailMessage)
            ->subject($subject)
            ->line($line)
            ->line('Si vous n’êtes pas à l’origine de cette action, veuillez contacter le support.');
    }
}
