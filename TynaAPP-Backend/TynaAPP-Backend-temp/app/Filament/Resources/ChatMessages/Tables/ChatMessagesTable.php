<?php

namespace App\Filament\Resources\ChatMessages\Tables;

use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Actions\ViewAction;
use Filament\Tables\Columns\BadgeColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class ChatMessagesTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('meeting.title')
                    ->label('Réunion')
                    ->limit(30)
                    ->sortable()
                    ->searchable(),
                BadgeColumn::make('role')
                    ->colors([
                        'primary' => 'user',
                        'success' => 'assistant',
                        'warning' => 'system',
                    ])
                    ->label('Rôle')
                    ->sortable(),
                TextColumn::make('content')
                    ->label('Message')
                    ->limit(60)
                    ->wrap()
                    ->searchable(),
                TextColumn::make('created_at')
                    ->label('Créé le')
                    ->dateTime()
                    ->sortable(),
            ])
            ->filters([
                //
            ])
            ->recordActions([
                ViewAction::make(),
                EditAction::make(),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ]);
    }
}
