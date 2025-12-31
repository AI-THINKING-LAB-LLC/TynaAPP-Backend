<?php

namespace App\Filament\Resources\MeetingSummaries\Pages;

use App\Filament\Resources\MeetingSummaries\MeetingSummaryResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListMeetingSummaries extends ListRecords
{
    protected static string $resource = MeetingSummaryResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
