<?php

namespace App\Filament\Resources\Transcripts\Tables;

use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Actions\ForceDeleteBulkAction;
use Filament\Actions\RestoreBulkAction;
use Filament\Actions\ViewAction;
use Filament\Tables\Columns\BadgeColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\TrashedFilter;
use Filament\Tables\Table;

class TranscriptsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('meeting.title')
                    ->label('Réunion')
                    ->limit(40)
                    ->sortable()
                    ->searchable(),
                TextColumn::make('speaker')
                    ->label('Intervenant')
                    ->limit(30)
                    ->sortable()
                    ->searchable(),
                TextColumn::make('text')
                    ->label('Texte')
                    ->limit(80)
                    ->wrap()
                    ->searchable(),
                TextColumn::make('timestamp')
                    ->label('Horodatage (s)')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('language_code')
                    ->label('Langue')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                BadgeColumn::make('confidence')
                    ->label('Confiance')
                    ->colors([
                        'success' => fn ($state) => $state >= 0.8,
                        'warning' => fn ($state) => $state >= 0.5 && $state < 0.8,
                        'danger' => fn ($state) => $state < 0.5,
                    ])
                    ->formatStateUsing(fn ($state) => $state !== null ? number_format((float) $state, 2) : null)
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('created_at')
                    ->label('Créé le')
                    ->dateTime()
                    ->sortable(),
            ])
            ->filters([
                TrashedFilter::make(),
            ])
            ->recordActions([
                ViewAction::make(),
                EditAction::make(),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                    ForceDeleteBulkAction::make(),
                    RestoreBulkAction::make(),
                ]),
            ]);
    }
}
