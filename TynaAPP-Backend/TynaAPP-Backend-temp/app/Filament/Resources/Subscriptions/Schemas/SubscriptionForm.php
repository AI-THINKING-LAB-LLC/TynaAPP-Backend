<?php

namespace App\Filament\Resources\Subscriptions\Schemas;

use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Schema;

class SubscriptionForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Select::make('user_id')
                    ->label('Utilisateur')
                    ->relationship('user', 'email')
                    ->searchable()
                    ->required(),
                TextInput::make('plan')
                    ->label('Plan')
                    ->required()
                    ->maxLength(255),
                TextInput::make('status')
                    ->label('Statut')
                    ->required()
                    ->maxLength(50)
                    ->default('active'),
                DateTimePicker::make('starts_at')
                    ->label('Début')
                    ->nullable(),
                DateTimePicker::make('ends_at')
                    ->label('Fin')
                    ->nullable(),
            ]);
    }
}
