<?php

namespace App\Filament\Resources\MeetingSummaries\Schemas;

use Filament\Infolists\Components\TextEntry;
use Filament\Schemas\Schema;

class MeetingSummaryInfolist
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextEntry::make('meeting.title')
                    ->label('Réunion')
                    ->placeholder('-'),
                TextEntry::make('summary')
                    ->label('Résumé')
                    ->placeholder('-'),
                TextEntry::make('action_items')
                    ->label('Actions')
                    ->placeholder('-')
                    ->limit(200)
                    ->tooltip(fn ($state) => $state),
                TextEntry::make('created_at')
                    ->label('Créé le')
                    ->dateTime()
                    ->placeholder('-'),
            ]);
    }
}
