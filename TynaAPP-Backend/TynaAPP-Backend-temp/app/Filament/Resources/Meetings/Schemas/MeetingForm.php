<?php

namespace App\Filament\Resources\Meetings\Schemas;

use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Schema;

class MeetingForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Select::make('user_id')
                    ->label('Profil')
                    ->relationship('profile', 'full_name')
                    ->searchable()
                    ->required(),
                TextInput::make('title')
                    ->label('Titre')
                    ->required(),
                Select::make('status')
                    ->label('Statut')
                    ->options([
                        'live' => 'Live',
                        'ended' => 'Terminé',
                    ])
                    ->default('live')
                    ->required(),
                DateTimePicker::make('started_at')
                    ->label('Début')
                    ->required(),
                DateTimePicker::make('ended_at')
                    ->label('Fin')
                    ->nullable(),
                TextInput::make('duration_seconds')
                    ->label('Durée (s)')
                    ->numeric()
                    ->minValue(0)
                    ->nullable(),
            ]);
    }
}
