// Copyright 2025 Julien Darras. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Containers/Ticker.h"
#include "MovieRenderPipelineDataTypes.h"
#include "Subsystems/GameInstanceSubsystem.h"

#include "UURenderResultSubsystem.generated.h"

class UMoviePipelineBase;

/**
 * Fiche de fin de rendu pour UltiUnreal.
 *
 * Active seulement si la ligne de commande contient -UURenderResultFile=<chemin>.
 * À la fin de chaque pipeline Movie Render Queue, écrit (de façon atomique) un
 * JSON indiquant le succès rapporté par Unreal et la liste exacte des fichiers
 * produits. L'application s'en sert comme preuve du résultat au lieu de
 * deviner la sortie en cherchant un fichier récent dans le dossier.
 */
UCLASS()
class ULTIUNREALRENDERBRIDGE_API UURenderResultSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    virtual bool ShouldCreateSubsystem(UObject* Outer) const override;
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;
    virtual void Deinitialize() override;

private:
    bool BindNewPipelines(float DeltaTime);
    void HandlePipelineWorkFinished(FMoviePipelineOutputData Results);
    bool WriteResultFile() const;

    FTSTicker::FDelegateHandle TickerHandle;
    TArray<TWeakObjectPtr<UMoviePipelineBase>> BoundPipelines;

    FString ResultFilePath;
    FString JobId;

    int32 FinishedPipelineCount = 0;
    bool bAllSucceeded = true;
    TArray<FString> OutputFiles;
};
