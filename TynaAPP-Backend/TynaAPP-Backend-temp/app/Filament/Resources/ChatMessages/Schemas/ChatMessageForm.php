<?php

namespace App\Filament\Resources\ChatMessages\Schemas;

use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Schemas\Schema;

class ChatMessageForm
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
                Select::make('role')
                    ->label('Rôle')
                    ->options([
                        'user' => 'Utilisateur',
                        'assistant' => 'Assistant',
                        'system' => 'Système',
                    ])
                    ->required(),
                Textarea::make('content')
                    ->label('Message')
                    ->rows(4)
                    ->required(),
                DateTimePicker::make('created_at')
                    ->label('Créé le')
                    ->seconds(false)
                    ->required(),
            ]);
    }
}
