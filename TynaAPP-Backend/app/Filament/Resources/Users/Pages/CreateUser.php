<?php

namespace App\Filament\Resources\Users\Pages;

use App\Filament\Resources\Users\UserResource;
use App\Services\PlanAssignmentService;
use Filament\Resources\Pages\CreateRecord;

class CreateUser extends CreateRecord
{
    protected static string $resource = UserResource::class;

    /**
     * After creating a user, automatically assign the Starter plan
     */
    protected function afterCreate(): void
    {
        // Attribuer automatiquement le plan Starter (gratuit) au nouvel utilisateur
        PlanAssignmentService::assignStarterPlan($this->record);
    }
}
