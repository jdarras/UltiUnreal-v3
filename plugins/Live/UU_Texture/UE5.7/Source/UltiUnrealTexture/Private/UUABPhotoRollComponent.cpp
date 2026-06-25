// Copyright 2026 Julien Darras. All Rights Reserved.

#include "UUABPhotoRollComponent.h"

#include "UltiUnrealTexture.h"

#include "Async/Async.h"
#include "Components/MeshComponent.h"
#include "Engine/Texture2D.h"
#include "TextureResource.h"
#include "Engine/Texture.h" // FTexture2DMipMap
#include "IImageWrapper.h"
#include "IImageWrapperModule.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "Modules/ModuleManager.h"

UUABPhotoRollComponent::UUABPhotoRollComponent()
{
	PrimaryComponentTick.bCanEverTick = true;
	PrimaryComponentTick.bStartWithTickEnabled = false; // tick only during transitions
	PrimaryComponentTick.TickInterval = 0.0f;
}

void UUABPhotoRollComponent::BeginPlay()
{
	Super::BeginPlay();
	EnsureInitialized();

	// Start visible by default
	ApplyFade(0.0f);
	ApplyBlend((ActiveSlot == EUUABPhotoSlot::A) ? 0.0f : 1.0f);

	SetComponentTickEnabled(false);
}

void UUABPhotoRollComponent::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	Super::EndPlay(EndPlayReason);
}

void UUABPhotoRollComponent::TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction)
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

void UUABPhotoRollComponent::SetTargetMesh(UMeshComponent* InMesh)
{
	TargetMesh = InMesh;
	MID = nullptr;
	EnsureMID();
}

void UUABPhotoRollComponent::SetMaterialIndex(int32 InMaterialIndex)
{
	MaterialIndex = InMaterialIndex;
	MID = nullptr;
	EnsureMID();
}

void UUABPhotoRollComponent::Stop()
{
	EnsureInitialized();
	StartFadeToBlack(fade_to_black_seconds);
}

void UUABPhotoRollComponent::Cue(const FString& FileUrlOverride)
{
	EnsureInitialized();
	const EUUABPhotoSlot TargetSlot = (ActiveSlot == EUUABPhotoSlot::A) ? EUUABPhotoSlot::B : EUUABPhotoSlot::A;
	CueSlot(TargetSlot, FileUrlOverride);
}

void UUABPhotoRollComponent::CueA(const FString& FileUrlOverride)
{
	CueSlot(EUUABPhotoSlot::A, FileUrlOverride);
}

void UUABPhotoRollComponent::CueB(const FString& FileUrlOverride)
{
	CueSlot(EUUABPhotoSlot::B, FileUrlOverride);
}

void UUABPhotoRollComponent::Play()
{
	EnsureInitialized();

	// If cue is in progress and not ready yet, take when ready.
	if (State == EUUABPhotoState::Cueing && !IsSlotReady(CuedSlot))
	{
		bTakeAfterCue = true;
		return;
	}

	// If cued not ready, auto-take after cue
	if (!IsSlotReady(CuedSlot))
	{
		bTakeAfterCue = true;
		if (debug_logs)
		{
			UE_LOG(LogUltiUnrealTexture, Warning, TEXT("UUABPhotoRoll: Play() called but CuedSlot is not ready. Call Cue(url) first."));
		}
		return;
	}

	const bool bIsBlackNow = (CurrentFade >= 0.999f) || (State == EUUABPhotoState::Black);
	if (bIsBlackNow)
	{
		// Set blend instantly to target while black
		const float TargetBlend = (CuedSlot == EUUABPhotoSlot::A) ? 0.0f : 1.0f;
		ApplyBlend(TargetBlend);

		ActiveSlot = CuedSlot;
		StartFadeFromBlack(fade_to_black_seconds);
		return;
	}

	StartCrossfade(crossfade_seconds, CuedSlot);
}

void UUABPhotoRollComponent::EnsureInitialized()
{
	if (!TargetMesh)
	{
		if (AActor* Owner = GetOwner())
		{
			TargetMesh = Owner->FindComponentByClass<UMeshComponent>();
		}
	}
	EnsureMID();
}

bool UUABPhotoRollComponent::EnsureMID()
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
				TEXT("UUABPhotoRoll: TargetMesh is null (call SetTargetMesh or add a MeshComponent to the actor)"));
		}
		return false;
	}

	const int32 NumMats = TargetMesh->GetNumMaterials();
	if (MaterialIndex < 0 || MaterialIndex >= NumMats)
	{
		UE_LOG(LogUltiUnrealTexture, Warning,
			TEXT("UUABPhotoRoll: invalid MaterialIndex=%d (Num=%d)"), MaterialIndex, NumMats);
		return false;
	}

	MID = Cast<UMaterialInstanceDynamic>(TargetMesh->GetMaterial(MaterialIndex));

	const bool bWasCreated = (MID == nullptr);
	if (!MID)
	{
		MID = TargetMesh->CreateAndSetMaterialInstanceDynamic(MaterialIndex);
	}

	if (!MID)
	{
		UE_LOG(LogUltiUnrealTexture, Warning, TEXT("UUABPhotoRoll: failed to create MID (mat %d)"), MaterialIndex);
		return false;
	}

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
				TEXT("UUABPhotoRoll: material on mesh '%s' (slot %d) is missing required params. Need: Tex '%s','%s' + Scalar '%s','%s'."),
				*GetNameSafe(TargetMesh),
				MaterialIndex,
				*texture_parameter_a.ToString(),
				*texture_parameter_b.ToString(),
				*blend_parameter.ToString(),
				*fade_parameter.ToString()
			);
		}
	}

	// Re-apply textures if we already have them
	ApplyTextureToMID(EUUABPhotoSlot::A);
	ApplyTextureToMID(EUUABPhotoSlot::B);

	return true;
}

void UUABPhotoRollComponent::SetState(EUUABPhotoState NewState)
{
	if (State == NewState)
	{
		return;
	}
	State = NewState;
	OnStateChanged.Broadcast(State);
}

void UUABPhotoRollComponent::ApplyBlend(float Blend01)
{
	if (!EnsureMID()) return;
	CurrentBlend = FMath::Clamp(Blend01, 0.0f, 1.0f);
	MID->SetScalarParameterValue(blend_parameter, CurrentBlend);
}

void UUABPhotoRollComponent::ApplyFade(float Fade01)
{
	if (!EnsureMID()) return;
	CurrentFade = FMath::Clamp(Fade01, 0.0f, 1.0f);
	MID->SetScalarParameterValue(fade_parameter, CurrentFade);
}

void UUABPhotoRollComponent::StartFadeToBlack(float Seconds)
{
	TransitionMode = ETransitionMode::FadeToBlack;
	TransitionT = 0.0f;
	TransitionDuration = FMath::Max(0.0f, Seconds);
	TransitionStart = CurrentFade;
	TransitionEnd = 1.0f;
	SetState(EUUABPhotoState::Transition);
	SetComponentTickEnabled(true);
}

void UUABPhotoRollComponent::StartFadeFromBlack(float Seconds)
{
	TransitionMode = ETransitionMode::FadeFromBlack;
	TransitionT = 0.0f;
	TransitionDuration = FMath::Max(0.0f, Seconds);
	TransitionStart = CurrentFade;
	TransitionEnd = 0.0f;
	SetState(EUUABPhotoState::Transition);
	SetComponentTickEnabled(true);
}

void UUABPhotoRollComponent::StartCrossfade(float Seconds, EUUABPhotoSlot TargetSlot)
{
	TransitionMode = ETransitionMode::Crossfade;
	TransitionT = 0.0f;
	TransitionDuration = FMath::Max(0.0f, Seconds);
	TransitionStart = CurrentBlend;
	TransitionEnd = (TargetSlot == EUUABPhotoSlot::A) ? 0.0f : 1.0f;
	SetState(EUUABPhotoState::Transition);
	SetComponentTickEnabled(true);
}

void UUABPhotoRollComponent::FinishTransition()
{
	const ETransitionMode Finished = TransitionMode;
	TransitionMode = ETransitionMode::None;

	SetComponentTickEnabled(false);

	if (Finished == ETransitionMode::FadeToBlack)
	{
		ApplyFade(1.0f);
		SetState(EUUABPhotoState::Black);
		return;
	}

	if (Finished == ETransitionMode::FadeFromBlack)
	{
		ApplyFade(0.0f);
		SetState((ActiveSlot == EUUABPhotoSlot::A) ? EUUABPhotoState::ShowingA : EUUABPhotoState::ShowingB);
		// prepare next cued slot
		CuedSlot = (ActiveSlot == EUUABPhotoSlot::A) ? EUUABPhotoSlot::B : EUUABPhotoSlot::A;
		return;
	}

	if (Finished == ETransitionMode::Crossfade)
	{
		ActiveSlot = CuedSlot;
		ApplyBlend((ActiveSlot == EUUABPhotoSlot::A) ? 0.0f : 1.0f);
		SetState((ActiveSlot == EUUABPhotoSlot::A) ? EUUABPhotoState::ShowingA : EUUABPhotoState::ShowingB);
		// prepare next cued slot
		CuedSlot = (ActiveSlot == EUUABPhotoSlot::A) ? EUUABPhotoSlot::B : EUUABPhotoSlot::A;
		return;
	}

	SetState(EUUABPhotoState::Idle);
}

bool UUABPhotoRollComponent::IsSlotReady(EUUABPhotoSlot Slot) const
{
	return (Slot == EUUABPhotoSlot::A) ? bSlotAReady : bSlotBReady;
}

void UUABPhotoRollComponent::SetSlotReady(EUUABPhotoSlot Slot, bool bReady)
{
	if (Slot == EUUABPhotoSlot::A) bSlotAReady = bReady;
	else bSlotBReady = bReady;
}

void UUABPhotoRollComponent::ApplyTextureToMID(EUUABPhotoSlot Slot)
{
	if (!EnsureMID()) return;

	UTexture2D* Tex = (Slot == EUUABPhotoSlot::A) ? TextureA : TextureB;
	if (!Tex) return;

	const FName Param = (Slot == EUUABPhotoSlot::A) ? texture_parameter_a : texture_parameter_b;
	MID->SetTextureParameterValue(Param, Tex);
}

FString UUABPhotoRollComponent::NormalizeSource(const FString& In) const
{
	FString S = In;
	S.TrimStartAndEndInline();
	S.ReplaceInline(TEXT("\""), TEXT(""));
	S.ReplaceInline(TEXT("\\"), TEXT("/"));
	return S;
}

static bool UU_IsHex(TCHAR C)
{
	return (C >= '0' && C <= '9') || (C >= 'A' && C <= 'F') || (C >= 'a' && C <= 'f');
}

static uint8 UU_HexVal(TCHAR C)
{
	if (C >= '0' && C <= '9') return uint8(C - '0');
	if (C >= 'A' && C <= 'F') return uint8(C - 'A' + 10);
	return uint8(C - 'a' + 10);
}

FString UUABPhotoRollComponent::UrlDecode(const FString& In) const
{
	FString Out;
	Out.Reserve(In.Len());

	for (int32 i = 0; i < In.Len(); ++i)
	{
		const TCHAR C = In[i];
		if (C == '+')
		{
			Out.AppendChar(' ');
			continue;
		}

		if (C == '%' && i + 2 < In.Len() && UU_IsHex(In[i + 1]) && UU_IsHex(In[i + 2]))
		{
			const uint8 Hi = UU_HexVal(In[i + 1]);
			const uint8 Lo = UU_HexVal(In[i + 2]);
			const uint8 Byte = uint8((Hi << 4) | Lo);
			Out.AppendChar(TCHAR(Byte));
			i += 2;
		}
		else
		{
			Out.AppendChar(C);
		}
	}
	return Out;
}

FString UUABPhotoRollComponent::NormalizeFileUrlToPath(const FString& InFileUrl) const
{
	FString S = NormalizeSource(InFileUrl);
	if (S.IsEmpty()) return FString();

	S = UrlDecode(S);

	// Reject http(s)
	if (S.StartsWith(TEXT("http://"), ESearchCase::IgnoreCase) || S.StartsWith(TEXT("https://"), ESearchCase::IgnoreCase))
	{
		UE_LOG(LogUltiUnrealTexture, Warning, TEXT("UUABPhotoRoll: http(s) not supported: %s"), *InFileUrl);
		return FString();
	}

	// Handle file://
	if (S.StartsWith(TEXT("file://"), ESearchCase::IgnoreCase))
	{
		S.RightChopInline(7);
		// Windows: file:///D:/... -> "/D:/..." then strip first '/'
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

bool UUABPhotoRollComponent::DecodeImageToBGRA(const FString& FullPath, TArray<uint8>& OutBGRA, int32& OutW, int32& OutH, FString& OutErr) const
{
	OutBGRA.Reset();
	OutW = 0;
	OutH = 0;
	OutErr.Reset();

	if (FullPath.IsEmpty() || !FPaths::FileExists(FullPath))
	{
		OutErr = FString::Printf(TEXT("File not found: %s"), *FullPath);
		return false;
	}

	TArray<uint8> FileData;
	if (!FFileHelper::LoadFileToArray(FileData, *FullPath))
	{
		OutErr = FString::Printf(TEXT("Failed to read: %s"), *FullPath);
		return false;
	}

	IImageWrapperModule& ImageWrapperModule = FModuleManager::LoadModuleChecked<IImageWrapperModule>(FName("ImageWrapper"));
	const EImageFormat Format = ImageWrapperModule.DetectImageFormat(FileData.GetData(), FileData.Num());
	if (Format == EImageFormat::Invalid)
	{
		OutErr = FString::Printf(TEXT("Unsupported image format: %s"), *FullPath);
		return false;
	}

	TSharedPtr<IImageWrapper> Wrapper = ImageWrapperModule.CreateImageWrapper(Format);
	if (!Wrapper.IsValid() || !Wrapper->SetCompressed(FileData.GetData(), FileData.Num()))
	{
		OutErr = FString::Printf(TEXT("Image wrapper failed: %s"), *FullPath);
		return false;
	}

	const int32 BitDepth = Wrapper->GetBitDepth();
	if (BitDepth > 8)
	{
		UE_LOG(LogUltiUnrealTexture, Warning,
			TEXT("UUABPhotoRoll: High bit depth (%dbit) image (%d) converted to 8-bit BGRA: %s"),
			BitDepth, (int32)Format, *FullPath);
	}

	OutW = Wrapper->GetWidth();
	OutH = Wrapper->GetHeight();

	// Optional: warn about very large images (VRAM spike risk)
	if ((int64)OutW * (int64)OutH > (int64)4096 * (int64)4096)
	{
		UE_LOG(LogUltiUnrealTexture, Warning,
			TEXT("UUABPhotoRoll: Very large image %dx%d may use a lot of VRAM: %s"),
			OutW, OutH, *FullPath);
	}

	if (!Wrapper->GetRaw(ERGBFormat::BGRA, 8, OutBGRA))
	{
		OutErr = FString::Printf(TEXT("GetRaw failed: %s"), *FullPath);
		return false;
	}

	return true;
}

UTexture2D* UUABPhotoRollComponent::CreateTransientTextureBGRA(const TArray<uint8>& BGRA, int32 W, int32 H) const
{
	if (W <= 0 || H <= 0 || BGRA.Num() != W * H * 4)
	{
		return nullptr;
	}

	UTexture2D* NewTexture = UTexture2D::CreateTransient(W, H, PF_B8G8R8A8);
	if (!NewTexture || !NewTexture->GetPlatformData() || NewTexture->GetPlatformData()->Mips.Num() == 0)
	{
		return nullptr;
	}

	NewTexture->SRGB = true;

	FTexture2DMipMap& Mip = NewTexture->GetPlatformData()->Mips[0];
	Mip.BulkData.Lock(LOCK_READ_WRITE);
	void* Data = Mip.BulkData.Realloc(BGRA.Num());
	FMemory::Memcpy(Data, BGRA.GetData(), BGRA.Num());
	Mip.BulkData.Unlock();

	NewTexture->UpdateResource();
	return NewTexture;
}

void UUABPhotoRollComponent::CueSlot(EUUABPhotoSlot Slot, const FString& FileUrlOverride)
{
	EnsureInitialized();

	const FString Path = NormalizeFileUrlToPath(FileUrlOverride);
	if (Path.IsEmpty())
	{
		SetState(EUUABPhotoState::Error);
		OnCueFailed.Broadcast(Slot, TEXT("Invalid FileUrlOverride (empty or unsupported)."));
		return;
	}

	CuedSlot = Slot;
	SetSlotReady(Slot, false);
	SetState(EUUABPhotoState::Cueing);

	// Token to ignore out-of-order finishes
	const uint64 Token = ++CueTokenCounter;
	if (Slot == EUUABPhotoSlot::A) PendingTokenA = Token;
	else PendingTokenB = Token;

	TWeakObjectPtr<UUABPhotoRollComponent> WeakThis(this);

	Async(EAsyncExecution::ThreadPool, [WeakThis, Slot, Path, Token]()
		{
			TArray<uint8> BGRA;
			int32 W = 0;
			int32 H = 0;
			FString Err;

			bool bOk = false;
			if (WeakThis.IsValid())
			{
				bOk = WeakThis->DecodeImageToBGRA(Path, BGRA, W, H, Err);
			}
			else
			{
				return;
			}

			AsyncTask(ENamedThreads::GameThread, [WeakThis, Slot, Path, Token, bOk, W, H, BGRA = MoveTemp(BGRA), Err]()
				{
					if (!WeakThis.IsValid())
					{
						return;
					}

					// Ignore stale completion
					if (Slot == EUUABPhotoSlot::A)
					{
						if (WeakThis->PendingTokenA != Token) return;
					}
					else
					{
						if (WeakThis->PendingTokenB != Token) return;
					}

					if (!bOk)
					{
						WeakThis->SetState(EUUABPhotoState::Error);
						WeakThis->OnCueFailed.Broadcast(Slot, Err.IsEmpty() ? TEXT("Decode failed") : Err);
						WeakThis->bTakeAfterCue = false;
						return;
					}

					UTexture2D* Tex = WeakThis->CreateTransientTextureBGRA(BGRA, W, H);
					if (!Tex)
					{
						WeakThis->SetState(EUUABPhotoState::Error);
						WeakThis->OnCueFailed.Broadcast(Slot, TEXT("CreateTransientTexture failed"));
						WeakThis->bTakeAfterCue = false;
						return;
					}

					if (Slot == EUUABPhotoSlot::A)
					{
						if (WeakThis->TextureA)
						{
							WeakThis->TextureA->ReleaseResource(); // libère côté GPU
						}
						WeakThis->TextureA = Tex;
					}
					else
					{
						if (WeakThis->TextureB)
						{
							WeakThis->TextureB->ReleaseResource();
						}
						WeakThis->TextureB = Tex;
					}

					WeakThis->SetSlotReady(Slot, true);
					WeakThis->ApplyTextureToMID(Slot);

					// Return to showing/black state
					if (WeakThis->CurrentFade >= 0.999f || WeakThis->State == EUUABPhotoState::Black)
					{
						WeakThis->SetState(EUUABPhotoState::Black);
					}
					else
					{
						WeakThis->SetState((WeakThis->ActiveSlot == EUUABPhotoSlot::A) ? EUUABPhotoState::ShowingA : EUUABPhotoState::ShowingB);
					}

					WeakThis->OnCueReady.Broadcast(Slot, Path);

					if (WeakThis->bTakeAfterCue)
					{
						WeakThis->bTakeAfterCue = false;
						WeakThis->Play();
					}
				});
		});
}
