// Copyright 2026 Julien Darras. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "UUMediaTextureTarget.generated.h"

class UMeshComponent;
class UMediaPlayer;
class UMediaTexture;
class UFileMediaSource;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FUUMediaTextureTargetOpened, FString, OpenedUrl);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FUUMediaTextureTargetFailed, FString, FailedUrl);

UCLASS(ClassGroup = (UltiUnrealTexture), meta = (BlueprintSpawnableComponent))
class ULTIUNREALTEXTURE_API UUMediaTextureTarget : public UActorComponent
{
	GENERATED_BODY()

public:
	UUMediaTextureTarget();

	UFUNCTION(BlueprintCallable, Category = "UltiUnrealTexture|Media")
	void SetTargetMesh(UMeshComponent* InMesh);

	UFUNCTION(BlueprintCallable, Category = "UltiUnrealTexture|Media")
	void SetMaterialIndex(int32 InMaterialIndex);

	UFUNCTION(BlueprintCallable, Category = "UltiUnrealTexture|Media")
	void SetTextureParameterName(FName InTextureParameterName);

	UFUNCTION(BlueprintCallable, Category = "UltiUnrealTexture|Media", meta = (DisplayName = "Set Media Texture From File"))
	bool SetMediaFromFile(const FString& FileUrl);

	// Events (used by async nodes)
	UPROPERTY(BlueprintAssignable, Category = "UltiUnrealTexture|Media")
	FUUMediaTextureTargetOpened OnOpened;

	UPROPERTY(BlueprintAssignable, Category = "UltiUnrealTexture|Media")
	FUUMediaTextureTargetFailed OnFailed;

	// Internal/advanced start (used by async nodes)
	bool SetMediaFromFileEx(const FString& FileUrl, bool bAutoPlay, bool bLoop, bool bClosePrevious);

	UFUNCTION(BlueprintPure, Category = "UltiUnrealTexture|Media")
	UMediaPlayer* GetMediaPlayer() const { return MediaPlayer; }

	UFUNCTION(BlueprintPure, Category = "UltiUnrealTexture|Media")
	UMediaTexture* GetMediaTexture() const { return MediaTexture; }


private:
	UPROPERTY(Transient)
	TObjectPtr<UMeshComponent> TargetMesh = nullptr;

	UPROPERTY(Transient)
	int32 MaterialIndex = 0;

	UPROPERTY(Transient)
	FName TextureParameterName = NAME_None;

	UPROPERTY(Transient)
	TObjectPtr<UMediaPlayer> MediaPlayer = nullptr;

	UPROPERTY(Transient)
	TObjectPtr<UMediaTexture> MediaTexture = nullptr;

	UPROPERTY(Transient)
	TObjectPtr<UFileMediaSource> MediaSource = nullptr;

	UFUNCTION()
	void HandleMediaOpened(FString OpenedUrl);

	bool ApplyMediaTexture();

	UPROPERTY(Transient)
	bool bAutoPlayOnOpen = false;

	UFUNCTION()
	void HandleMediaOpenFailed(FString FailedUrl);

};

