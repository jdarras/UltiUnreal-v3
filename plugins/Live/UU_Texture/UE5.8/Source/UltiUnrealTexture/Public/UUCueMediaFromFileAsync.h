// Copyright 2026 Julien Darras. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintAsyncActionBase.h"
#include "UUCueMediaFromFileAsync.generated.h"

class UMediaPlayer;
class UMediaTexture;
class UFileMediaSource;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(
	FUUCueMediaFromFileOpened,
	UMediaPlayer*, MediaPlayer,
	UMediaTexture*, MediaTexture,
	const FString&, OpenedUrl
);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(
	FUUCueMediaFromFileFailed,
	UMediaPlayer*, MediaPlayer,
	UMediaTexture*, MediaTexture,
	const FString&, Error
);

UCLASS()
class ULTIUNREALTEXTURE_API UUCueMediaFromFileAsync : public UBlueprintAsyncActionBase
{
	GENERATED_BODY()

public:
	UPROPERTY(BlueprintAssignable)
	FUUCueMediaFromFileOpened OnOpened;

	UPROPERTY(BlueprintAssignable)
	FUUCueMediaFromFileFailed OnFailed;

	UFUNCTION(BlueprintCallable, meta = (BlueprintInternalUseOnly = "true", WorldContext = "WorldContextObject", DisplayName = "UU Cue Media From File"), Category = "UltiUnrealTexture|Media")
	static UUCueMediaFromFileAsync* UU_CueMediaFromFile(UObject* WorldContextObject, const FString& FileUrl);

	virtual void Activate() override;

private:
	UPROPERTY()
	TObjectPtr<UObject> WorldContextObject;

	UPROPERTY()
	FString RequestedUrl;

	UPROPERTY()
	TObjectPtr<UMediaPlayer> MediaPlayer;

	UPROPERTY()
	TObjectPtr<UMediaTexture> MediaTexture;

	UPROPERTY()
	TObjectPtr<UFileMediaSource> MediaSource;

	UFUNCTION()
	void HandleMediaOpened(FString OpenedUrl);

	UFUNCTION()
	void HandleMediaOpenFailed(FString FailedUrl);

	FString NormalizeFileUrlToPath(const FString& FileUrl, FString& OutError) const;
	void FinishAndCleanup();
};

