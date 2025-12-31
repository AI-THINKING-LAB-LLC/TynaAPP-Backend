<?php

namespace App\Filament\Resources\MeetingSummaries\Pages;

use App\Filament\Resources\MeetingSummaries\MeetingSummaryResource;
use Filament\Actions\DeleteAction;
use Filament\Actions\ViewAction;
use Filament\Resources\Pages\EditRecord;

class EditMeetingSummary extends EditRecord
{
    protected static string $resource = MeetingSummaryResource::class;

    protected function getHeaderActions(): array
    {
        return [
            ViewAction::make(),
            DeleteAction::make(),
        ];
    }
}
