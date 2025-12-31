<?php

namespace App\Filament\Resources\EmailSettings;

use App\Filament\Resources\EmailSettings\Pages\EditEmailSetting;
use App\Filament\Resources\EmailSettings\Pages\ListEmailSettings;
use App\Filament\Resources\EmailSettings\Pages\CreateEmailSetting;
use App\Models\EmailSetting;
use BackedEnum;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class EmailSettingResource extends Resource
{
    protected static ?string $model = EmailSetting::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedEnvelope;

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('validation_subject')
                    ->label('Sujet validation')
                    ->required(),
                Textarea::make('validation_body')
                    ->label('Corps validation (texte)')
                    ->rows(4)
                    ->nullable(),
                TextInput::make('welcome_subject')
                    ->label('Sujet bienvenue')
                    ->required(),
                Textarea::make('welcome_body')
                    ->label('Corps bienvenue (texte)')
                    ->rows(4)
                    ->nullable(),
                TextInput::make('subscription_subject')
                    ->label('Sujet souscription')
                    ->required(),
                Textarea::make('subscription_body')
                    ->label('Corps souscription (texte)')
                    ->rows(4)
                    ->nullable(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('validation_subject')->label('Validation - sujet'),
                TextColumn::make('welcome_subject')->label('Bienvenue - sujet'),
                TextColumn::make('subscription_subject')->label('Souscription - sujet'),
                TextColumn::make('updated_at')->label('Modifié le')->dateTime(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => ListEmailSettings::route('/'),
            'create' => CreateEmailSetting::route('/create'),
            'edit' => EditEmailSetting::route('/{record}/edit'),
        ];
    }
}
