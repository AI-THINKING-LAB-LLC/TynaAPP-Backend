<?php

namespace App\Filament\Resources\MeetingSummaries\Pages;

use App\Filament\Resources\MeetingSummaries\MeetingSummaryResource;
use Filament\Actions\EditAction;
use Filament\Resources\Pages\ViewRecord;

class ViewMeetingSummary extends ViewRecord
{
    protected static string $resource = MeetingSummaryResource::class;

    protected function getHeaderActions(): array
    {
        return [
            EditAction::make(),
        ];
    }
}
