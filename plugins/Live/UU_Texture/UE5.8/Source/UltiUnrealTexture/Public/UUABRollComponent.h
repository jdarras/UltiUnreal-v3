// Copyright 2026 Julien Darras. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "UUABRollComponent.generated.h"

class UMeshComponent;
class UMediaPlayer;
class UMediaTexture;
class UMediaSource;

UENUM(BlueprintType)
enum class EUUABRollSlot : uint8
{
	A UMETA(DisplayName = "A"),
	B UMETA(DisplayName = "B"),
};

UENUM(BlueprintType)
enum class EUUABRollState : uint8
{
	Idle UMETA(DisplayName = "Idle"),
	Black UMETA(DisplayName = "Black"),
	ShowingA UMETA(DisplayName = "Showing A"),
	ShowingB UMETA(DisplayName = "Showing B"),
	Cueing UMETA(DisplayName = "Cueing"),
	Transition UMETA(DisplayName = "Transition"),
	Error UMETA(DisplayName = "Error"),
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FUUABRollCueReady, EUUABRollSlot, Slot, const FString&, OpenedUrl);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FUUABRollCueFailed, EUUABRollSlot, Slot, const FString&, Error);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FUUABRollStateChanged, EUUABRollState, NewState);

/**
 * AB Roll controller (A/B + Fade To Black) driven by a blend material.
 *
 * Expected material parameters (configurable):
 * - Texture A param (default: MediaTextureA)
 * - Texture B param (default: MediaTextureB)
 * - Blend param 0..1 (default: BlendAB)       0=A, 1=B
 * - Fade param 0..1  (default: FadeToBlack)   0=normal, 1=black
 */
UCLASS(ClassGroup = (UltiUnrealTexture), meta = (BlueprintSpawnableComponent))
class ULTIUNREALTEXTURE_API UUABRollComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	UUABRollComponent();

	virtual void BeginPlay() override;
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;
	virtual void TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction) override;

	// Target
	UFUNCTION(BlueprintCallable, Category = "UltiUnrealTexture|AB Roll")
	void SetTargetMesh(UMeshComponent* InMesh);

	UFUNCTION(BlueprintCallable, Category = "UltiUnrealTexture|AB Roll")
	void SetMaterialIndex(int32 InMaterialIndex);

	// Material params
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UltiUnrealTexture|AB Roll|Material")
	FName texture_parameter_a = TEXT("MediaTextureA");

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UltiUnrealTexture|AB Roll|Material")
	FName texture_parameter_b = TEXT("MediaTextureB");

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UltiUnrealTexture|AB Roll|Material")
	FName blend_parameter = TEXT("BlendAB");

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UltiUnrealTexture|AB Roll|Material")
	FName fade_parameter = TEXT("FadeToBlack");

	// Sources
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UltiUnrealTexture|AB Roll|Source")
	FString source_a_path;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UltiUnrealTexture|AB Roll|Source")
	FString source_b_path;

	/** Cue offset as timecode (HH:MM:SS:FF) or seconds (e.g. "3.5s") */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UltiUnrealTexture|AB Roll|Source")
	FString cue_offset = TEXT("00:00:00:00");

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UltiUnrealTexture|AB Roll|Playback")
	bool loop = true;

	/** If true, the inactive slot is paused after a successful TAKE. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UltiUnrealTexture|AB Roll|Playback")
	bool pause_inactive_after_play = true;

	// Transitions
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UltiUnrealTexture|AB Roll|Transition", meta = (ClampMin = "0.0"))
	float fade_to_black_seconds = 0.5f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UltiUnrealTexture|AB Roll|Transition", meta = (ClampMin = "0.0"))
	float crossfade_seconds = 0.5f;

	// Debug
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UltiUnrealTexture|AB Roll|Debug")
	bool debug_logs = true;

	// Events
	UPROPERTY(BlueprintAssignable, Category = "UltiUnrealTexture|AB Roll")
	FUUABRollCueReady OnCueReady;

	UPROPERTY(BlueprintAssignable, Category = "UltiUnrealTexture|AB Roll")
	FUUABRollCueFailed OnCueFailed;

	UPROPERTY(BlueprintAssignable, Category = "UltiUnrealTexture|AB Roll")
	FUUABRollStateChanged OnStateChanged;

	// Actions
	/** STOP = fade to black and stay black (does not close media). */
	UFUNCTION(BlueprintCallable, Category = "UltiUnrealTexture|AB Roll")
	void Stop();

	/** CUE = prepare slot A (open + seek + pause) without changing live image. */
	UFUNCTION(BlueprintCallable, Category = "UltiUnrealTexture|AB Roll")
	void CueA(const FString& FileUrlOverride = TEXT(""));

	/** CUE = prepare slot B (open + seek + pause) without changing live image. */
	UFUNCTION(BlueprintCallable, Category = "UltiUnrealTexture|AB Roll")
	void CueB(const FString& FileUrlOverride = TEXT(""));

	/** CUE = prepare the non-live slot automatically (based on ActiveSlot) without changing live image. */
	UFUNCTION(BlueprintCallable, Category = "UltiUnrealTexture|AB Roll")
	void Cue(const FString& FileUrlOverride = TEXT(""));

	/** PLAY =
	 * - if currently black: fade from black to CUE slot
	 * - else: crossfade from currently visible slot to CUE slot
	 */
	UFUNCTION(BlueprintCallable, Category = "UltiUnrealTexture|AB Roll")
	void Play();

	UFUNCTION(BlueprintPure, Category = "UltiUnrealTexture|AB Roll")
	EUUABRollState GetState() const { return State; }

	UFUNCTION(BlueprintPure, Category = "UltiUnrealTexture|AB Roll")
	EUUABRollSlot GetActiveSlot() const { return ActiveSlot; }

	UFUNCTION(BlueprintPure, Category = "UltiUnrealTexture|AB Roll")
	EUUABRollSlot GetCuedSlot() const { return CuedSlot; }

private:
	// Target
	UPROPERTY(Transient) TObjectPtr<UMeshComponent> TargetMesh = nullptr;
	UPROPERTY(Transient) int32 MaterialIndex = 0;
	UPROPERTY(Transient) TObjectPtr<class UMaterialInstanceDynamic> MID = nullptr;

	// Media
	UPROPERTY(Transient) TObjectPtr<UMediaPlayer> PlayerA = nullptr;
	UPROPERTY(Transient) TObjectPtr<UMediaPlayer> PlayerB = nullptr;
	UPROPERTY(Transient) TObjectPtr<UMediaTexture> TextureA = nullptr;
	UPROPERTY(Transient) TObjectPtr<UMediaTexture> TextureB = nullptr;
	UPROPERTY(Transient) TObjectPtr<UMediaSource> SourceA = nullptr;
	UPROPERTY(Transient) TObjectPtr<UMediaSource> SourceB = nullptr;

	UPROPERTY(Transient) bool bSlotAReady = false;
	UPROPERTY(Transient) bool bSlotBReady = false;

	UPROPERTY(Transient) EUUABRollState State = EUUABRollState::Idle;
	UPROPERTY(Transient) EUUABRollSlot ActiveSlot = EUUABRollSlot::A;
	UPROPERTY(Transient) EUUABRollSlot CuedSlot = EUUABRollSlot::B;

	// Transition
	enum class ETransitionMode : uint8
	{
		None,
		FadeToBlack,
		FadeFromBlack,
		Crossfade,
	};

	ETransitionMode TransitionMode = ETransitionMode::None;
	float TransitionT = 0.0f;
	float TransitionDuration = 0.0f;
	float TransitionStart = 0.0f;
	float TransitionEnd = 0.0f;
	bool bTakeAfterCue = false;

	float CurrentBlend = 0.0f;
	float CurrentFade = 0.0f;

	void EnsureInitialized();
	bool EnsureMID();

	void SetState(EUUABRollState NewState);
	void ApplyBlend(float Blend01);
	void ApplyFade(float Fade01);
	float GetCurrentBlendGuess() const;
	float GetCurrentFadeGuess() const;

	void StartFadeToBlack(float Seconds);
	void StartFadeFromBlack(float Seconds);
	void StartCrossfade(float Seconds, EUUABRollSlot TargetSlot);
	void FinishTransition();

	void CueSlot(EUUABRollSlot Slot, const FString& FileUrlOverride);
	FString GetSlotUrl(EUUABRollSlot Slot, const FString& Override) const;
	UMediaPlayer* GetSlotPlayer(EUUABRollSlot Slot) const;
	UMediaTexture* GetSlotTexture(EUUABRollSlot Slot) const;
	bool IsSlotReady(EUUABRollSlot Slot) const;
	void SetSlotReady(EUUABRollSlot Slot, bool bReady);

	FString NormalizeSource(const FString& In) const;
	FString NormalizeFilePath(const FString& In) const;
	FString NormalizeOffsetDisplay(const FString& In) const;
	float GetEffectiveFps(UMediaPlayer* PlayerIfOpen) const;
	FTimespan OffsetToTimespan(const FString& In, float Fps, bool& bOk) const;

	void ApplyTextureToMID(EUUABRollSlot Slot);
	void PauseSlot(EUUABRollSlot Slot);
	void PlaySlot(EUUABRollSlot Slot);

	bool bWarnedMaterialParams = false;

	UFUNCTION() void HandleAOpened(FString OpenedUrl);
	UFUNCTION() void HandleAOpenFailed(FString FailedUrl);
	UFUNCTION() void HandleBOpened(FString OpenedUrl);
	UFUNCTION() void HandleBOpenFailed(FString FailedUrl);
};

