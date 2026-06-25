// Copyright 2026 Julien Darras. All Rights Reserved.

#include "UUSetMediaTextureFromFileAsync.h"

#include "UltiUnrealTexture.h"
#include "Components/MeshComponent.h"
#include "GameFramework/Actor.h"

// Media
#include "MediaPlayer.h"
#include "MediaTexture.h"

#include "UUMediaTextureTarget.h"

UUSetMediaTextureFromFileAsync* UUSetMediaTextureFromFileAsync::UU_SetMediaTextureFromFileAsync(
    UMeshComponent* Mesh,
    int32 MaterialIndex,
    FName TextureParameterName,
    const FString& FileUrl,
    bool bAutoPlay,
    bool bLoop,
    bool bClosePrevious)
{
    UUSetMediaTextureFromFileAsync* Action = NewObject<UUSetMediaTextureFromFileAsync>();
    Action->TargetMesh = Mesh;
    Action->TargetMaterialIndex = MaterialIndex;
    Action->TargetTextureParam = TextureParameterName;
    Action->RequestedUrl = FileUrl;
    Action->bTargetAutoPlay = bAutoPlay;
    Action->bTargetLoop = bLoop;
    Action->bTargetClosePrevious = bClosePrevious;
    return Action;
}

void UUSetMediaTextureFromFileAsync::Activate()
{
    if (!TargetMesh)
    {
        BroadcastImmediateFail(TEXT("Mesh is null"));
        return;
    }

    AActor* Owner = TargetMesh->GetOwner();
    if (!Owner)
    {
        BroadcastImmediateFail(TEXT("Mesh owner is null"));
        return;
    }

    UUMediaTextureTarget* Target = Owner->FindComponentByClass<UUMediaTextureTarget>();
    if (!Target)
    {
        Target = NewObject<UUMediaTextureTarget>(Owner, UUMediaTextureTarget::StaticClass(), NAME_None, RF_Transient);
        if (!Target)
        {
            BroadcastImmediateFail(TEXT("Failed to create UUMediaTextureTarget"));
            return;
        }

        Owner->AddInstanceComponent(Target);
        Target->RegisterComponent();
    }

    TargetComponent = Target;

    // Bind BEFORE launching open
    TargetComponent->OnOpened.AddDynamic(this, &UUSetMediaTextureFromFileAsync::HandleOpened);
    TargetComponent->OnFailed.AddDynamic(this, &UUSetMediaTextureFromFileAsync::HandleFailed);

    TargetComponent->SetTargetMesh(TargetMesh);
    TargetComponent->SetMaterialIndex(TargetMaterialIndex);
    TargetComponent->SetTextureParameterName(TargetTextureParam);

    const bool bStarted = TargetComponent->SetMediaFromFileEx(RequestedUrl, bTargetAutoPlay, bTargetLoop, bTargetClosePrevious);
    if (!bStarted)
    {
        BroadcastImmediateFail(TEXT("OpenSource failed (see log for details)"));
    }
}

void UUSetMediaTextureFromFileAsync::HandleOpened(FString OpenedUrl)
{
    UMediaPlayer* Player = TargetComponent ? TargetComponent->GetMediaPlayer() : nullptr;
    UMediaTexture* Texture = TargetComponent ? TargetComponent->GetMediaTexture() : nullptr;
    Loaded.Broadcast(Player, Texture, OpenedUrl);
    Cleanup();
}

void UUSetMediaTextureFromFileAsync::HandleFailed(FString FailedUrl)
{
    UMediaPlayer* Player = TargetComponent ? TargetComponent->GetMediaPlayer() : nullptr;
    UMediaTexture* Texture = TargetComponent ? TargetComponent->GetMediaTexture() : nullptr;
    Failed.Broadcast(Player, Texture, FailedUrl);
    Cleanup();
}

void UUSetMediaTextureFromFileAsync::BroadcastImmediateFail(const FString& Error)
{
    UE_LOG(LogUltiUnrealTexture, Warning, TEXT("UU Set Media Texture From File (Async): %s"), *Error);
    UMediaPlayer* Player = TargetComponent ? TargetComponent->GetMediaPlayer() : nullptr;
    UMediaTexture* Texture = TargetComponent ? TargetComponent->GetMediaTexture() : nullptr;
    Failed.Broadcast(Player, Texture, Error);
    Cleanup();
}

void UUSetMediaTextureFromFileAsync::Cleanup()
{
    if (TargetComponent)
    {
        TargetComponent->OnOpened.RemoveDynamic(this, &UUSetMediaTextureFromFileAsync::HandleOpened);
        TargetComponent->OnFailed.RemoveDynamic(this, &UUSetMediaTextureFromFileAsync::HandleFailed);
    }

    SetReadyToDestroy();
}
