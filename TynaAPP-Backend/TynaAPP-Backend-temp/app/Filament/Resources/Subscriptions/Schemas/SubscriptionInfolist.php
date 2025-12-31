<?php

namespace App\Filament\Resources\Subscriptions\Schemas;

use Filament\Infolists\Components\TextEntry;
use Filament\Schemas\Schema;

class SubscriptionInfolist
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextEntry::make('user.email')
                    ->label('Utilisateur')
                    ->placeholder('-'),
                TextEntry::make('plan')
                    ->label('Plan'),
                TextEntry::make('status')
                    ->label('Statut'),
                TextEntry::make('starts_at')
                    ->label('Début')
                    ->dateTime()
                    ->placeholder('-'),
                TextEntry::make('ends_at')
                    ->label('Fin')
                    ->dateTime()
                    ->placeholder('-'),
                TextEntry::make('created_at')
                    ->label('Créé le')
                    ->dateTime(),
            ]);
    }
}
