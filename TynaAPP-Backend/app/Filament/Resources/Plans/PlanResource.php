<?php

namespace App\Filament\Resources\Plans;

use App\Filament\Resources\Plans\Pages\CreatePlan;
use App\Filament\Resources\Plans\Pages\EditPlan;
use App\Filament\Resources\Plans\Pages\ListPlans;
use App\Models\Plan;
use BackedEnum;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\BooleanColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class PlanResource extends Resource
{
    protected static ?string $model = Plan::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedTag;

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('name')
                    ->label('Nom')
                    ->required()
                    ->maxLength(255),
                TextInput::make('stripe_product_id')
                    ->label('Stripe product ID')
                    ->required()
                    ->maxLength(255),
                TextInput::make('stripe_price_id')
                    ->label('Stripe price ID')
                    ->required()
                    ->unique(ignoreRecord: true)
                    ->maxLength(255),
                Select::make('interval')
                    ->label('Intervalle')
                    ->options([
                        'day' => 'Jour',
                        'week' => 'Semaine',
                        'month' => 'Mois',
                        'year' => 'Année',
                    ])
                    ->default('month')
                    ->required(),
                TextInput::make('amount')
                    ->label('Montant (cents)')
                    ->numeric()
                    ->integer()
                    ->minValue(0)
                    ->nullable(),
                TextInput::make('currency')
                    ->label('Devise')
                    ->maxLength(3)
                    ->default('usd')
                    ->required(),
                TextInput::make('trial_days')
                    ->label('Jours d’essai')
                    ->numeric()
                    ->integer()
                    ->minValue(0)
                    ->nullable(),
                Toggle::make('allow_promotion_codes')
                    ->label('Autoriser codes promo')
                    ->default(false),
                Toggle::make('active')
                    ->label('Actif')
                    ->default(true),
                Textarea::make('description')
                    ->label('Description')
                    ->rows(3)
                    ->nullable(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')->label('Nom')->searchable(),
                TextColumn::make('stripe_price_id')->label('Price ID')->copyable(),
                TextColumn::make('interval')->label('Intervalle'),
                TextColumn::make('amount')->label('Montant (cents)')->sortable(),
                TextColumn::make('currency')->label('Devise'),
                BooleanColumn::make('active')->label('Actif'),
                TextColumn::make('updated_at')->label('Modifié le')->dateTime(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => ListPlans::route('/'),
            'create' => CreatePlan::route('/create'),
            'edit' => EditPlan::route('/{record}/edit'),
        ];
    }
}
