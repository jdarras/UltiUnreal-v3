// Copyright 2026 Julien Darras. All Rights Reserved.

#include "UUABRollComponent.h"

#include "UltiUnrealTexture.h"

#include "Components/MeshComponent.h"
#include "FileMediaSource.h"
#include "StreamMediaSource.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "MediaPlayer.h"
#include "MediaSource.h"
#include "MediaTexture.h"
#include "Misc/Paths.h"
#include "Engine/World.h"

UUABRollComponent::UUABRollComponent()
{
	PrimaryComponentTick.bCanEverTick = true;
	PrimaryComponentTick.bStartWithTickEnabled = true;
	PrimaryComponentTick.TickInterval = 0.0f;
}

void UUABRollComponent::BeginPlay()
{
	Super::BeginPlay();
	EnsureInitialized();

	// Start in "not black" by default.
	ApplyFade(0.0f);
	ApplyBlend(GetCurrentBlendGuess());

	SetComponentTickEnabled(false);
}

void UUABRollComponent::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	// Unbind delegates
	if (PlayerA)
	{
		PlayerA->OnMediaOpened.RemoveAll(this);
		PlayerA->OnMediaOpenFailed.RemoveAll(this);
	}
	if (PlayerB)
	{
		PlayerB->OnMediaOpened.RemoveAll(this);
		PlayerB->OnMediaOpenFailed.RemoveAll(this);
	}

	Super::EndPlay(EndPlayReason);
}

void UUABRollComponent::TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);

	if (TransitionMode == ETransitionMode::None)
	{
		return;
	}

	if (TransitionDuration <= 0.0f)
	{
		FinishTransition();
		return;
	}

	TransitionT += DeltaTime;
	const float Alpha = FMath::Clamp(TransitionT / TransitionDuration, 0.0f, 1.0f);
	const float V = FMath::Lerp(TransitionStart, TransitionEnd, Alpha);

	switch (TransitionMode)
	{
	case ETransitionMode::FadeToBlack:
	case ETransitionMode::FadeFromBlack:
		ApplyFade(V);
		break;
	case ETransitionMode::Crossfade:
		ApplyBlend(V);
		break;
	default:
		break;
	}

	if (Alpha >= 1.0f)
	{
		FinishTransition();
	}
}

void UUABRollComponent::SetTargetMesh(UMeshComponent* InMesh)
{
	TargetMesh = InMesh;
	MID = nullptr;
	EnsureMID();
}

void UUABRollComponent::SetMaterialIndex(int32 InMaterialIndex)
{
	MaterialIndex = InMaterialIndex;
	MID = nullptr;
	EnsureMID();
}

void UUABRollComponent::Stop()
{
	EnsureInitialized();
	StartFadeToBlack(fade_to_black_seconds);
}

void UUABRollComponent::CueA(const FString& FileUrlOverride)
{
	CueSlot(EUUABRollSlot::A, FileUrlOverride);
}

void UUABRollComponent::CueB(const FString& FileUrlOverride)
{
	CueSlot(EUUABRollSlot::B, FileUrlOverride);
}

void UUABRollComponent::Cue(const FString& FileUrlOverride)
{
	EnsureInitialized();

	const EUUABRollSlot TargetSlot =
		(ActiveSlot == EUUABRollSlot::A) ? EUUABRollSlot::B : EUUABRollSlot::A;

	CueSlot(TargetSlot, FileUrlOverride);
}

void UUABRollComponent::Play()
{
	EnsureInitialized();
	
	if (State == EUUABRollState::Cueing && !IsSlotReady(CuedSlot))
	{
		bTakeAfterCue = true;
		return;
	}

	// Ensure cued slot exists/ready. If not ready, cue it and auto-take when ready.
	if (!IsSlotReady(CuedSlot))
	{
		bTakeAfterCue = true;
		CueSlot(CuedSlot, TEXT(""));
		return;
	}

	// If we are black, hide any A/B jump behind black, then fade from black.
	const bool bIsBlackNow = (CurrentFade >= 0.999f) || (State == EUUABRollState::Black);
	if (bIsBlackNow)
	{
		// Set blend instantly to target while black.
		const float TargetBlend = (CuedSlot == EUUABRollSlot::A) ? 0.0f : 1.0f;
		ApplyBlend(TargetBlend);

		// Start playback of the target slot.
		PlaySlot(CuedSlot);
		if (pause_inactive_after_play)
		{
			PauseSlot((CuedSlot == EUUABRollSlot::A) ? EUUABRollSlot::B : EUUABRollSlot::A);
		}

		ActiveSlot = CuedSlot;
		StartFadeFromBlack(fade_to_black_seconds);
		return;
	}

	// Normal case: crossfade Active <-> Cued.
	// Make sure both are playing so the mid-blend has motion.
	PlaySlot(ActiveSlot);
	PlaySlot(CuedSlot);

	StartCrossfade(crossfade_seconds, CuedSlot);
}

void UUABRollComponent::EnsureInitialized()
{
	if (!TargetMesh)
	{
		// Auto-find a mesh on the owner (first match) if not set.
		if (AActor* Owner = GetOwner())
		{
			TargetMesh = Owner->FindComponentByClass<UMeshComponent>();
		}
	}

	EnsureMID();

	if (!PlayerA)
	{
		PlayerA = NewObject<UMediaPlayer>(this);
		PlayerA->PlayOnOpen = false;
		PlayerA->OnMediaOpened.AddDynamic(this, &UUABRollComponent::HandleAOpened);
		PlayerA->OnMediaOpenFailed.AddDynamic(this, &UUABRollComponent::HandleAOpenFailed);
	}

	if (!PlayerB)
	{
		PlayerB = NewObject<UMediaPlayer>(this);
		PlayerB->PlayOnOpen = false;
		PlayerB->OnMediaOpened.AddDynamic(this, &UUABRollComponent::HandleBOpened);
		PlayerB->OnMediaOpenFailed.AddDynamic(this, &UUABRollComponent::HandleBOpenFailed);
	}

	if (!TextureA)
	{
		TextureA = NewObject<UMediaTexture>(this);
		TextureA->SetMediaPlayer(PlayerA);
		TextureA->UpdateResource();
		ApplyTextureToMID(EUUABRollSlot::A);
	}
	if (!TextureB)
	{
		TextureB = NewObject<UMediaTexture>(this);
		TextureB->SetMediaPlayer(PlayerB);
		TextureB->UpdateResource();
		ApplyTextureToMID(EUUABRollSlot::B);
	}
}

bool UUABRollComponent::EnsureMID()
{
	// If editor/RC re-applied the mesh material, our cached MID may no longer be on the mesh.
	if (TargetMesh && MID)
	{
		UMaterialInterface* Current = TargetMesh->GetMaterial(MaterialIndex);
		if (Current != MID)
		{
			MID = nullptr;
		}
	}

	if (MID && TargetMesh)
	{
		return true;
	}

	if (!TargetMesh)
	{
		if (debug_logs)
		{
			UE_LOG(LogUltiUnrealTexture, Warning,
				TEXT("UUABRoll: TargetMesh is null (call SetTargetMesh or add a MeshComponent to the actor)"));
		}
		return false;
	}

	const int32 NumMats = TargetMesh->GetNumMaterials();
	if (MaterialIndex < 0 || MaterialIndex >= NumMats)
	{
		UE_LOG(LogUltiUnrealTexture, Warning,
			TEXT("UUABRoll: invalid MaterialIndex=%d (Num=%d)"), MaterialIndex, NumMats);
		return false;
	}

	// Try to reuse existing MID on the mesh slot.
	MID = Cast<UMaterialInstanceDynamic>(TargetMesh->GetMaterial(MaterialIndex));

	const bool bWasCreated = (MID == nullptr);
	if (!MID)
	{
		MID = TargetMesh->CreateAndSetMaterialInstanceDynamic(MaterialIndex);
	}

	if (!MID)
	{
		UE_LOG(LogUltiUnrealTexture, Warning, TEXT("UUABRoll: failed to create MID (mat %d)"), MaterialIndex);
		return false;
	}

	// If we just created the MID, re-apply current scalar values without calling ApplyBlend/ApplyFade
	// (avoid recursion / extra EnsureMID calls).
	if (bWasCreated)
	{
		MID->SetScalarParameterValue(blend_parameter, FMath::Clamp(CurrentBlend, 0.0f, 1.0f));
		MID->SetScalarParameterValue(fade_parameter, FMath::Clamp(CurrentFade, 0.0f, 1.0f));
	}

	// Warn once if the material doesn't expose expected parameters.
	if (!bWarnedMaterialParams)
	{
		bWarnedMaterialParams = true;

		float DummyScalar = 0.0f;
		UTexture* DummyTex = nullptr;

		const bool bHasBlend = MID->GetScalarParameterValue(blend_parameter, DummyScalar);
		const bool bHasFade = MID->GetScalarParameterValue(fade_parameter, DummyScalar);
		const bool bHasTexA = MID->GetTextureParameterValue(texture_parameter_a, DummyTex);
		const bool bHasTexB = MID->GetTextureParameterValue(texture_parameter_b, DummyTex);

		if (!bHasBlend || !bHasFade || !bHasTexA || !bHasTexB)
		{
			UE_LOG(LogUltiUnrealTexture, Error,
				TEXT("UUABRoll: material on mesh '%s' (slot %d) is missing required params. Need: Tex '%s','%s' + Scalar '%s','%s'. Check the master material on that slot."),
				*GetNameSafe(TargetMesh),
				MaterialIndex,
				*texture_parameter_a.ToString(),
				*texture_parameter_b.ToString(),
				*blend_parameter.ToString(),
				*fade_parameter.ToString()
			);
		}
	}

	// Re-apply current textures after MID (re)creation.
	ApplyTextureToMID(EUUABRollSlot::A);
	ApplyTextureToMID(EUUABRollSlot::B);

	return true;
}

void UUABRollComponent::SetState(EUUABRollState NewState)
{
	if (State == NewState)
	{
		return;
	}
	State = NewState;
	OnStateChanged.Broadcast(State);
}

void UUABRollComponent::ApplyBlend(float Blend01)
{
	if (!EnsureMID()) return;
	CurrentBlend = FMath::Clamp(Blend01, 0.0f, 1.0f);
	MID->SetScalarParameterValue(blend_parameter, CurrentBlend);
}

void UUABRollComponent::ApplyFade(float Fade01)
{
	if (!EnsureMID()) return;
	CurrentFade = FMath::Clamp(Fade01, 0.0f, 1.0f);
	MID->SetScalarParameterValue(fade_parameter, CurrentFade);
}

float UUABRollComponent::GetCurrentBlendGuess() const
{
	// We track it by ActiveSlot (0=A, 1=B)
	return (ActiveSlot == EUUABRollSlot::A) ? 0.0f : 1.0f;
}

float UUABRollComponent::GetCurrentFadeGuess() const
{
	// We track it by State
	return (State == EUUABRollState::Black) ? 1.0f : 0.0f;
}

void UUABRollComponent::StartFadeToBlack(float Seconds)
{
	SetComponentTickEnabled(true);
	TransitionMode = ETransitionMode::FadeToBlack;
	TransitionT = 0.0f;
	TransitionDuration = FMath::Max(0.0f, Seconds);
	TransitionStart = CurrentFade;
	TransitionEnd = 1.0f;
	SetState(EUUABRollState::Transition);
}

void UUABRollComponent::StartFadeFromBlack(float Seconds)
{
	SetComponentTickEnabled(true);
	TransitionMode = ETransitionMode::FadeFromBlack;
	TransitionT = 0.0f;
	TransitionDuration = FMath::Max(0.0f, Seconds);
	TransitionStart = CurrentFade;
	TransitionEnd = 0.0f;
	SetState(EUUABRollState::Transition);
}

void UUABRollComponent::StartCrossfade(float Seconds, EUUABRollSlot TargetSlot)
{
	SetComponentTickEnabled(true);
	TransitionMode = ETransitionMode::Crossfade;
	TransitionT = 0.0f;
	TransitionDuration = FMath::Max(0.0f, Seconds);
	TransitionStart = CurrentBlend;
	TransitionEnd = (TargetSlot == EUUABRollSlot::A) ? 0.0f : 1.0f;
	SetState(EUUABRollState::Transition);
}

void UUABRollComponent::FinishTransition()
{
	SetComponentTickEnabled(false);
	const ETransitionMode Finished = TransitionMode;
	TransitionMode = ETransitionMode::None;

	if (Finished == ETransitionMode::FadeToBlack)
	{
		ApplyFade(1.0f);
		SetState(EUUABRollState::Black);
		return;
	}

	if (Finished == ETransitionMode::FadeFromBlack)
	{
		ApplyFade(0.0f);
		SetState((ActiveSlot == EUUABRollSlot::A) ? EUUABRollState::ShowingA : EUUABRollState::ShowingB);
		CuedSlot = (ActiveSlot == EUUABRollSlot::A) ? EUUABRollSlot::B : EUUABRollSlot::A;
		return;
	}

	if (Finished == ETransitionMode::Crossfade)
	{
		// Ended on CuedSlot
		ActiveSlot = CuedSlot;
		ApplyBlend((ActiveSlot == EUUABRollSlot::A) ? 0.0f : 1.0f);
		SetState((ActiveSlot == EUUABRollSlot::A) ? EUUABRollState::ShowingA : EUUABRollState::ShowingB);
		CuedSlot = (ActiveSlot == EUUABRollSlot::A) ? EUUABRollSlot::B : EUUABRollSlot::A;

		if (pause_inactive_after_play)
		{
			PauseSlot((ActiveSlot == EUUABRollSlot::A) ? EUUABRollSlot::B : EUUABRollSlot::A);
		}
		return;
	}

	// Fallback
	SetState(EUUABRollState::Idle);
}

void UUABRollComponent::CueSlot(EUUABRollSlot Slot, const FString& FileUrlOverride)
{
	EnsureInitialized();
	CuedSlot = Slot;

	const FString Url = GetSlotUrl(Slot, FileUrlOverride);
	if (Url.IsEmpty())
	{
		SetState(EUUABRollState::Error);
		OnCueFailed.Broadcast(Slot, TEXT("Source path is empty"));
		return;
	}

	UMediaPlayer* Player = GetSlotPlayer(Slot);
	if (!Player)
	{
		SetState(EUUABRollState::Error);
		OnCueFailed.Broadcast(Slot, TEXT("MediaPlayer is null"));
		return;
	}

	// Mark not ready while opening
	SetSlotReady(Slot, false);
	SetState(EUUABRollState::Cueing);

	// Build media source
	UMediaSource* NewSource = nullptr;
	const FString SrcNorm = NormalizeSource(Url);
	if (SrcNorm.StartsWith(TEXT("http://"), ESearchCase::IgnoreCase) || SrcNorm.StartsWith(TEXT("https://"), ESearchCase::IgnoreCase) || SrcNorm.StartsWith(TEXT("rtsp://"), ESearchCase::IgnoreCase))
	{
		UStreamMediaSource* Stream = NewObject<UStreamMediaSource>(this);
		Stream->StreamUrl = SrcNorm;
		NewSource = Stream;
	}
	else
	{
		UFileMediaSource* File = NewObject<UFileMediaSource>(this);
		FString PathNorm = NormalizeFilePath(SrcNorm);
		FPaths::MakePlatformFilename(PathNorm);
		if (PathNorm.IsEmpty() || !FPaths::FileExists(PathNorm))
		{
			SetState(EUUABRollState::Error);
			OnCueFailed.Broadcast(Slot, FString::Printf(TEXT("File not found: %s"), *PathNorm));
			return;
		}
		File->FilePath = PathNorm;
		NewSource = File;
	}

	Player->SetLooping(loop);

	// Store source
	if (Slot == EUUABRollSlot::A) SourceA = NewSource;
	else SourceB = NewSource;

	const bool bOpenOk = Player->OpenSource(NewSource);
	if (!bOpenOk)
	{
		SetState(EUUABRollState::Error);
		OnCueFailed.Broadcast(Slot, TEXT("OpenSource returned false"));
		return;
	}
}

FString UUABRollComponent::GetSlotUrl(EUUABRollSlot Slot, const FString& Override) const
{
	if (!Override.IsEmpty())
	{
		return Override;
	}
	return (Slot == EUUABRollSlot::A) ? source_a_path : source_b_path;
}

UMediaPlayer* UUABRollComponent::GetSlotPlayer(EUUABRollSlot Slot) const
{
	return (Slot == EUUABRollSlot::A) ? PlayerA : PlayerB;
}

UMediaTexture* UUABRollComponent::GetSlotTexture(EUUABRollSlot Slot) const
{
	return (Slot == EUUABRollSlot::A) ? TextureA : TextureB;
}

bool UUABRollComponent::IsSlotReady(EUUABRollSlot Slot) const
{
	return (Slot == EUUABRollSlot::A) ? bSlotAReady : bSlotBReady;
}

void UUABRollComponent::SetSlotReady(EUUABRollSlot Slot, bool bReady)
{
	if (Slot == EUUABRollSlot::A) bSlotAReady = bReady;
	else bSlotBReady = bReady;
}

FString UUABRollComponent::NormalizeSource(const FString& In) const
{
	FString S = In;
	S.TrimStartAndEndInline();
	S.ReplaceInline(TEXT("\""), TEXT(""));
	S.ReplaceInline(TEXT("\\"), TEXT("/"));
	return S;
}

FString UUABRollComponent::NormalizeFilePath(const FString& In) const
{
	FString S = NormalizeSource(In);
	if (S.IsEmpty()) return S;

	if (S.StartsWith(TEXT("file://"), ESearchCase::IgnoreCase))
	{
		S.RightChopInline(7);
		if (S.StartsWith(TEXT("/")) && S.Len() >= 3 && FChar::IsAlpha(S[1]) && S[2] == ':')
		{
			S.RightChopInline(1);
		}
	}

	if (FPaths::IsRelative(S))
	{
		S = FPaths::ConvertRelativePathToFull(S);
	}

	FPaths::NormalizeFilename(S);
	return S;
}

FString UUABRollComponent::NormalizeOffsetDisplay(const FString& In) const
{
	FString S = In;
	S.TrimStartAndEndInline();
	S.ReplaceInline(TEXT("."), TEXT(":"));

	if (S.IsEmpty())
	{
		return TEXT("00:00:00:00");
	}

	bool bIsSeconds = false;
	if (S.EndsWith(TEXT("s"), ESearchCase::IgnoreCase))
	{
		bIsSeconds = true;
		S.LeftChopInline(1);
		S.TrimStartAndEndInline();
	}

	if (!bIsSeconds)
	{
		TArray<FString> Parts;
		S.ParseIntoArray(Parts, TEXT(":"), true);
		int32 h = 0, m = 0, sec = 0, f = 0;
		auto to_int = [](const FString& P) -> int32 { return FCString::Atoi(*P); };
		const int32 n = Parts.Num();
		if (n >= 1) f = to_int(Parts[n - 1]);
		if (n >= 2) sec = to_int(Parts[n - 2]);
		if (n >= 3) m = to_int(Parts[n - 3]);
		if (n >= 4) h = to_int(Parts[n - 4]);
		return FString::Printf(TEXT("%02d:%02d:%02d:%02d"), h, m, sec, f);
	}

	// seconds -> timecode-ish
	const float SecondsF = FCString::Atof(*S);
	const int32 TotalSec = FMath::FloorToInt(SecondsF);
	const float Frac = SecondsF - (float)TotalSec;
	const float Fps = 25.0f;
	const int32 Frames = FMath::RoundToInt(Frac * Fps);
	const int32 h = TotalSec / 3600;
	const int32 m = (TotalSec % 3600) / 60;
	const int32 sec = TotalSec % 60;
	return FString::Printf(TEXT("%02d:%02d:%02d:%02d"), h, m, sec, Frames);
}

float UUABRollComponent::GetEffectiveFps(UMediaPlayer* PlayerIfOpen) const
{
	if (PlayerIfOpen)
	{
		const float Fr = PlayerIfOpen->GetVideoTrackFrameRate(INDEX_NONE, INDEX_NONE);
		if (Fr > 1.0f && Fr < 1000.0f)
		{
			return Fr;
		}
	}
	return 25.0f;
}

FTimespan UUABRollComponent::OffsetToTimespan(const FString& In, float Fps, bool& bOk) const
{
	bOk = false;
	const FString Disp = NormalizeOffsetDisplay(In);
	TArray<FString> Parts;
	Disp.ParseIntoArray(Parts, TEXT(":"), true);
	if (Parts.Num() != 4) return FTimespan::Zero();

	const int32 h = FCString::Atoi(*Parts[0]);
	const int32 m = FCString::Atoi(*Parts[1]);
	const int32 s = FCString::Atoi(*Parts[2]);
	const int32 f = FCString::Atoi(*Parts[3]);

	const double TotalSeconds =
		(double)h * 3600.0 +
		(double)m * 60.0 +
		(double)s +
		((Fps > 0.0) ? ((double)f / (double)Fps) : 0.0);

	bOk = true;
	return FTimespan::FromSeconds(TotalSeconds);
}

void UUABRollComponent::ApplyTextureToMID(EUUABRollSlot Slot)
{
	if (!EnsureMID()) return;

	UMediaTexture* Tex = GetSlotTexture(Slot);
	if (!Tex) return;

	const FName Param = (Slot == EUUABRollSlot::A) ? texture_parameter_a : texture_parameter_b;
	MID->SetTextureParameterValue(Param, Tex);
}

void UUABRollComponent::PauseSlot(EUUABRollSlot Slot)
{
	if (UMediaPlayer* P = GetSlotPlayer(Slot))
	{
		P->Pause();
	}
}

void UUABRollComponent::PlaySlot(EUUABRollSlot Slot)
{
	if (UMediaPlayer* P = GetSlotPlayer(Slot))
	{
		P->SetLooping(loop);
		P->Play();
	}
}

void UUABRollComponent::HandleAOpened(FString OpenedUrl)
{
	// Cue ready: seek + pause
	if (PlayerA)
	{
		bool bOk = false;
		const float Fps = GetEffectiveFps(PlayerA);
		const FTimespan Ts = OffsetToTimespan(cue_offset, Fps, bOk);
		if (bOk)
		{
			PlayerA->Seek(Ts);
		}
		PlayerA->Pause();
	}

	SetSlotReady(EUUABRollSlot::A, true);
	CuedSlot = EUUABRollSlot::A;
	SetState((State == EUUABRollState::Black) ? EUUABRollState::Black : ((ActiveSlot == EUUABRollSlot::A) ? EUUABRollState::ShowingA : EUUABRollState::ShowingB));
	OnCueReady.Broadcast(EUUABRollSlot::A, OpenedUrl);

	if (bTakeAfterCue)
	{
		bTakeAfterCue = false;
		Play();
	}
}

void UUABRollComponent::HandleAOpenFailed(FString FailedUrl)
{
	SetSlotReady(EUUABRollSlot::A, false);
	SetState(EUUABRollState::Error);
	OnCueFailed.Broadcast(EUUABRollSlot::A, FailedUrl);
	if (bTakeAfterCue)
	{
		bTakeAfterCue = false;
	}
}

void UUABRollComponent::HandleBOpened(FString OpenedUrl)
{
	if (PlayerB)
	{
		bool bOk = false;
		const float Fps = GetEffectiveFps(PlayerB);
		const FTimespan Ts = OffsetToTimespan(cue_offset, Fps, bOk);
		if (bOk)
		{
			PlayerB->Seek(Ts);
		}
		PlayerB->Pause();
	}

	SetSlotReady(EUUABRollSlot::B, true);
	CuedSlot = EUUABRollSlot::B;
	SetState((State == EUUABRollState::Black) ? EUUABRollState::Black : ((ActiveSlot == EUUABRollSlot::A) ? EUUABRollState::ShowingA : EUUABRollState::ShowingB));
	OnCueReady.Broadcast(EUUABRollSlot::B, OpenedUrl);

	if (bTakeAfterCue)
	{
		bTakeAfterCue = false;
		Play();
	}
}

void UUABRollComponent::HandleBOpenFailed(FString FailedUrl)
{
	SetSlotReady(EUUABRollSlot::B, false);
	SetState(EUUABRollState::Error);
	OnCueFailed.Broadcast(EUUABRollSlot::B, FailedUrl);
	if (bTakeAfterCue)
	{
		bTakeAfterCue = false;
	}
}
