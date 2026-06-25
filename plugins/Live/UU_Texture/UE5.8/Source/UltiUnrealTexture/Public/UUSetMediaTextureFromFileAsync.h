// Copyright 2026 Julien Darras. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintAsyncActionBase.h"
#include "UUSetMediaTextureFromFileAsync.generated.h"

class UMeshComponent;
class UMediaPlayer;
class UMediaTexture;
class UUMediaTextureTarget;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(
    FUUSetMediaTextureFromFileAsyncLoaded,
    UMediaPlayer*, MediaPlayer,
    UMediaTexture*, MediaTexture,
    const FString&, OpenedUrl
);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(
    FUUSetMediaTextureFromFileAsyncFailed,
    UMediaPlayer*, MediaPlayer,
    UMediaTexture*, MediaTexture,
    const FString&, Error
);

UCLASS()
class ULTIUNREALTEXTURE_API UUSetMediaTextureFromFileAsync : public UBlueprintAsyncActionBase
{
    GENERATED_BODY()

public:
    UPROPERTY(BlueprintAssignable)
    FUUSetMediaTextureFromFileAsyncLoaded Loaded;

    UPROPERTY(BlueprintAssignable)
    FUUSetMediaTextureFromFileAsyncFailed Failed;

    UFUNCTION(BlueprintCallable,
        meta = (BlueprintInternalUseOnly = "true", DisplayName = "UU Set Media Texture From File (Async)"),
        Category = "UltiUnrealTexture|Media")
    static UUSetMediaTextureFromFileAsync* UU_SetMediaTextureFromFileAsync(
        UMeshComponent* Mesh,
        int32 MaterialIndex,
        FName TextureParameterName,
        const FString& FileUrl,
        bool bAutoPlay = true,
        bool bLoop = true,
        bool bClosePrevious = true
    );

    virtual void Activate() override;

private:
    UPROPERTY() TObjectPtr<UMeshComponent> TargetMesh;
    UPROPERTY() int32 TargetMaterialIndex = 0;
    UPROPERTY() FName TargetTextureParam = NAME_None;
    UPROPERTY() FString RequestedUrl;
    UPROPERTY() bool bTargetAutoPlay = true;
    UPROPERTY() bool bTargetLoop = true;
    UPROPERTY() bool bTargetClosePrevious = true;

    UPROPERTY() TObjectPtr<UUMediaTextureTarget> TargetComponent;

    UFUNCTION() void HandleOpened(FString OpenedUrl);
    UFUNCTION() void HandleFailed(FString FailedUrl);

    void BroadcastImmediateFail(const FString& Error);
    void Cleanup();
};

