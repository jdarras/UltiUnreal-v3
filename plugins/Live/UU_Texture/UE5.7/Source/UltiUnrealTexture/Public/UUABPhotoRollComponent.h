// Copyright 2026 Julien Darras. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "UUABPhotoRollComponent.generated.h"

class UMeshComponent;
class UTexture2D;
class UMaterialInstanceDynamic;

UENUM(BlueprintType)
enum class EUUABPhotoSlot : uint8
{
	A UMETA(DisplayName = "A"),
	B UMETA(DisplayName = "B"),
};

UENUM(BlueprintType)
enum class EUUABPhotoState : uint8
{
	Idle UMETA(DisplayName = "Idle"),
	Black UMETA(DisplayName = "Black"),
	ShowingA UMETA(DisplayName = "Showing A"),
	ShowingB UMETA(DisplayName = "Showing B"),
	Cueing UMETA(DisplayName = "Cueing"),
	Transition UMETA(DisplayName = "Transition"),
	Error UMETA(DisplayName = "Error"),
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FUUABPhotoCueReady, EUUABPhotoSlot, Slot, const FString&, LoadedUrl);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FUUABPhotoCueFailed, EUUABPhotoSlot, Slot, const FString&, Error);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FUUABPhotoStateChanged, EUUABPhotoState, NewState);

/**
 * AB Photo Roll controller (A/B + Fade To Black) driven by a blend material.
 *
 * Expected material parameters (configurable):
 * - Texture A param (default: MediaTextureA)
 * - Texture B param (default: MediaTextureB)
 * - Blend param 0..1 (default: BlendAB)       0=A, 1=B
 * - Fade param 0..1  (default: FadeToBlack)   0=normal, 1=black
 */
UCLASS(ClassGroup = (UltiUnrealTexture), meta = (BlueprintSpawnableComponent))
class ULTIUNREALTEXTURE_API UUABPhotoRollComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	UUABPhotoRollComponent();

	virtual void BeginPlay() override;
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;
	virtual void TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction) override;

	// Target
	UFUNCTION(BlueprintCallable, Category = "UltiUnrealTexture|AB Photo Roll")
	void SetTargetMesh(UMeshComponent* InMesh);

	UFUNCTION(BlueprintCallable, Category = "UltiUnrealTexture|AB Photo Roll")
	void SetMaterialIndex(int32 InMaterialIndex);

	// Material params
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UltiUnrealTexture|AB Photo Roll|Material")
	FName texture_parameter_a = TEXT("MediaTextureA");

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UltiUnrealTexture|AB Photo Roll|Material")
	FName texture_parameter_b = TEXT("MediaTextureB");

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UltiUnrealTexture|AB Photo Roll|Material")
	FName blend_parameter = TEXT("BlendAB");

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UltiUnrealTexture|AB Photo Roll|Material")
	FName fade_parameter = TEXT("FadeToBlack");

	// Transitions
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UltiUnrealTexture|AB Photo Roll|Transition", meta = (ClampMin = "0.0"))
	float fade_to_black_seconds = 0.5f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UltiUnrealTexture|AB Photo Roll|Transition", meta = (ClampMin = "0.0"))
	float crossfade_seconds = 0.5f;

	// Debug
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UltiUnrealTexture|AB Photo Roll|Debug")
	bool debug_logs = true;

	// Events
	UPROPERTY(BlueprintAssignable, Category = "UltiUnrealTexture|AB Photo Roll")
	FUUABPhotoCueReady OnCueReady;

	UPROPERTY(BlueprintAssignable, Category = "UltiUnrealTexture|AB Photo Roll")
	FUUABPhotoCueFailed OnCueFailed;

	UPROPERTY(BlueprintAssignable, Category = "UltiUnrealTexture|AB Photo Roll")
	FUUABPhotoStateChanged OnStateChanged;

	// Actions
	/** STOP = fade to black and stay black. */
	UFUNCTION(BlueprintCallable, Category = "UltiUnrealTexture|AB Photo Roll")
	void Stop();

	/** CUE = prepare the non-live slot automatically (based on ActiveSlot) without changing live image. */
	UFUNCTION(BlueprintCallable, Category = "UltiUnrealTexture|AB Photo Roll")
	void Cue(const FString& FileUrlOverride);

	/** Optional: force cue A/B if you want. */
	UFUNCTION(BlueprintCallable, Category = "UltiUnrealTexture|AB Photo Roll")
	void CueA(const FString& FileUrlOverride);

	UFUNCTION(BlueprintCallable, Category = "UltiUnrealTexture|AB Photo Roll")
	void CueB(const FString& FileUrlOverride);

	/** PLAY =
	 * - if currently black: fade from black to CUE slot
	 * - else: crossfade from currently visible slot to CUE slot
	 */
	UFUNCTION(BlueprintCallable, Category = "UltiUnrealTexture|AB Photo Roll")
	void Play();

	UFUNCTION(BlueprintPure, Category = "UltiUnrealTexture|AB Photo Roll")
	EUUABPhotoState GetState() const { return State; }

	UFUNCTION(BlueprintPure, Category = "UltiUnrealTexture|AB Photo Roll")
	EUUABPhotoSlot GetActiveSlot() const { return ActiveSlot; }

	UFUNCTION(BlueprintPure, Category = "UltiUnrealTexture|AB Photo Roll")
	EUUABPhotoSlot GetCuedSlot() const { return CuedSlot; }

private:
	// Target
	UPROPERTY(Transient) TObjectPtr<UMeshComponent> TargetMesh = nullptr;
	UPROPERTY(Transient) int32 MaterialIndex = 0;
	UPROPERTY(Transient) TObjectPtr<UMaterialInstanceDynamic> MID = nullptr;

	// Textures
	UPROPERTY(Transient) TObjectPtr<UTexture2D> TextureA = nullptr;
	UPROPERTY(Transient) TObjectPtr<UTexture2D> TextureB = nullptr;

	UPROPERTY(Transient) bool bSlotAReady = false;
	UPROPERTY(Transient) bool bSlotBReady = false;

	UPROPERTY(Transient) EUUABPhotoState State = EUUABPhotoState::Idle;
	UPROPERTY(Transient) EUUABPhotoSlot ActiveSlot = EUUABPhotoSlot::A;
	UPROPERTY(Transient) EUUABPhotoSlot CuedSlot = EUUABPhotoSlot::B;

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

	float CurrentBlend = 0.0f;
	float CurrentFade = 0.0f;

	bool bTakeAfterCue = false;

	// robustness
	bool bWarnedMaterialParams = false;

	// cue tokens (avoid out-of-order async finishes)
	uint64 CueTokenCounter = 0;
	uint64 PendingTokenA = 0;
	uint64 PendingTokenB = 0;

	void EnsureInitialized();
	bool EnsureMID();

	void SetState(EUUABPhotoState NewState);
	void ApplyBlend(float Blend01);
	void ApplyFade(float Fade01);

	void StartFadeToBlack(float Seconds);
	void StartFadeFromBlack(float Seconds);
	void StartCrossfade(float Seconds, EUUABPhotoSlot TargetSlot);
	void FinishTransition();

	void CueSlot(EUUABPhotoSlot Slot, const FString& FileUrlOverride);
	bool IsSlotReady(EUUABPhotoSlot Slot) const;
	void SetSlotReady(EUUABPhotoSlot Slot, bool bReady);
	void ApplyTextureToMID(EUUABPhotoSlot Slot);

	// file helpers
	FString NormalizeSource(const FString& In) const;
	FString UrlDecode(const FString& In) const;
	FString NormalizeFileUrlToPath(const FString& InFileUrl) const;

	// load + create texture
	bool DecodeImageToBGRA(const FString& FullPath, TArray<uint8>& OutBGRA, int32& OutW, int32& OutH, FString& OutErr) const;
	UTexture2D* CreateTransientTextureBGRA(const TArray<uint8>& BGRA, int32 W, int32 H) const;
};

