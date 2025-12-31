<?php

namespace App\Filament\Resources\MeetingSummaries;

use App\Filament\Resources\MeetingSummaries\Pages\CreateMeetingSummary;
use App\Filament\Resources\MeetingSummaries\Pages\EditMeetingSummary;
use App\Filament\Resources\MeetingSummaries\Pages\ListMeetingSummaries;
use App\Filament\Resources\MeetingSummaries\Pages\ViewMeetingSummary;
use App\Filament\Resources\MeetingSummaries\Schemas\MeetingSummaryForm;
use App\Filament\Resources\MeetingSummaries\Schemas\MeetingSummaryInfolist;
use App\Filament\Resources\MeetingSummaries\Tables\MeetingSummariesTable;
use App\Models\MeetingSummary;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Support\Icons\Heroicon;
use Filament\Schemas\Schema;
use Filament\Tables\Table;

class MeetingSummaryResource extends Resource
{
    protected static ?string $model = MeetingSummary::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedClipboardDocumentCheck;

    public static function form(Schema $schema): Schema
    {
        return MeetingSummaryForm::configure($schema);
    }

    public static function infolist(Schema $schema): Schema
    {
        return MeetingSummaryInfolist::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return MeetingSummariesTable::configure($table);
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
            'index' => ListMeetingSummaries::route('/'),
            'create' => CreateMeetingSummary::route('/create'),
            'view' => ViewMeetingSummary::route('/{record}'),
            'edit' => EditMeetingSummary::route('/{record}/edit'),
        ];
    }
}
