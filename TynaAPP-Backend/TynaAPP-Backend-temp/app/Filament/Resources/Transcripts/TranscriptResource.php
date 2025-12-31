<?php

namespace App\Filament\Resources\Transcripts;

use App\Filament\Resources\Transcripts\Pages\CreateTranscript;
use App\Filament\Resources\Transcripts\Pages\EditTranscript;
use App\Filament\Resources\Transcripts\Pages\ListTranscripts;
use App\Filament\Resources\Transcripts\Pages\ViewTranscript;
use App\Filament\Resources\Transcripts\Schemas\TranscriptForm;
use App\Filament\Resources\Transcripts\Schemas\TranscriptInfolist;
use App\Filament\Resources\Transcripts\Tables\TranscriptsTable;
use App\Models\Transcript;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class TranscriptResource extends Resource
{
    protected static ?string $model = Transcript::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedDocumentText;

    public static function form(Schema $schema): Schema
    {
        return TranscriptForm::configure($schema);
    }

    public static function infolist(Schema $schema): Schema
    {
        return TranscriptInfolist::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return TranscriptsTable::configure($table);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListTranscripts::route('/'),
            'create' => CreateTranscript::route('/create'),
            'view' => ViewTranscript::route('/{record}'),
            'edit' => EditTranscript::route('/{record}/edit'),
        ];
    }

    public static function getRecordRouteBindingEloquentQuery(): Builder
    {
        return parent::getRecordRouteBindingEloquentQuery()
            ->withoutGlobalScopes([
                SoftDeletingScope::class,
            ]);
    }
}
