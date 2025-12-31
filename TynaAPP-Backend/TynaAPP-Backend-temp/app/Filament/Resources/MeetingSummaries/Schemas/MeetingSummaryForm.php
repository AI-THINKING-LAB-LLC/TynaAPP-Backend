<?php

namespace App\Filament\Resources\MeetingSummaries\Schemas;

use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Schema;

class MeetingSummaryForm
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
                Textarea::make('summary')
                    ->label('Résumé')
                    ->rows(4)
                    ->required(),
                Textarea::make('action_items')
                    ->label('Actions')
                    ->rows(3)
                    ->helperText('JSON ou liste d’actions à suivre.'),
            ]);
    }
}
