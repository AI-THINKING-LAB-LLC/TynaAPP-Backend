<?php

namespace App\Filament\Resources\Profiles\Schemas;

use Filament\Forms\Components\TextInput;
use Filament\Schemas\Schema;

class ProfileForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('email')
                    ->label('Email')
                    ->email()
                    ->required(),
                TextInput::make('full_name')
                    ->label('Nom complet')
                    ->required(),
                TextInput::make('avatar_url')
                    ->label('Avatar URL')
                    ->url()
                    ->nullable(),
            ]);
    }
}
