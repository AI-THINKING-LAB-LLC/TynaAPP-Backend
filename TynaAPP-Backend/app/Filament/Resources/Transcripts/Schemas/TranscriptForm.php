<?php

namespace App\Filament\Resources\Transcripts\Schemas;

use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Schemas\Schema;

class TranscriptForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Select::make('meeting_id')
                    ->label('Réunion')
                    ->relationship('meeting', 'title')
                    ->searchable()
                    ->required(),
                TextInput::make('speaker')
                    ->label('Intervenant')
                    ->required(),
                Textarea::make('text')
                    ->label('Texte')
                    ->rows(4)
                    ->required(),
                TextInput::make('timestamp')
                    ->label('Horodatage (s)')
                    ->numeric()
                    ->minValue(0)
                    ->nullable(),
                TextInput::make('language_code')
                    ->label('Langue')
                    ->maxLength(10)
                    ->nullable(),
                TextInput::make('confidence')
                    ->label('Confiance')
                    ->numeric()
                    ->step(0.01)
                    ->minValue(0)
                    ->maxValue(1)
                    ->nullable(),
                DateTimePicker::make('created_at')
                    ->label('Créé le')
                    ->seconds(false)
                    ->required(),
            ]);
    }
}
