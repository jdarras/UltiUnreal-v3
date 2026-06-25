// Copyright 2026 Julien Darras. All Rights Reserved.

#include "UUMediaTextureTarget.h"

#include "UltiUnrealTexture.h"
#include "Components/MeshComponent.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Misc/Paths.h"

// Media
#include "MediaPlayer.h"
#include "MediaTexture.h"
#include "FileMediaSource.h"

namespace
{
	static FString UU_NormalizeFileUrlToPath_MediaTarget(const FString& InUrlOrPath)
	{
		FString S = InUrlOrPath;
		S.TrimStartAndEndInline();

		// Remove quotes
		if (S.Len() >= 2)
		{
			const TCHAR First = S[0];
			const TCHAR Last = S[S.Len() - 1];
			if ((First == '"' && Last == '"') || (First == '\'' && Last == '\''))
			{
				S = S.Mid(1, S.Len() - 2);
				S.TrimStartAndEndInline();
			}
		}

		// Accept file://, file:/// (Windows)
		if (S.StartsWith(TEXT("file://"), ESearchCase::IgnoreCase))
		{
			S.RightChopInline(7); // remove "file://"
			while (S.StartsWith(TEXT("/")))
			{
				S.RightChopInline(1);
			}

			// restore "D:/" style if needed
			if (S.Len() >= 2 && FChar::IsAlpha(S[0]) && S[1] == ':')
			{
				// ok
			}
			else
			{
				S = TEXT("/") + S;
			}
		}

		// Convert to full path if relative
		if (FPaths::IsRelative(S))
		{
			S = FPaths::ConvertRelativePathToFull(S);
		}

		return S;
	}
}

UUMediaTextureTarget::UUMediaTextureTarget()
{
	PrimaryComponentTick.bCanEverTick = false;
}

void UUMediaTextureTarget::SetTargetMesh(UMeshComponent* InMesh)
{
	TargetMesh = InMesh;
}

void UUMediaTextureTarget::SetMaterialIndex(int32 InMaterialIndex)
{
	MaterialIndex = InMaterialIndex;
}

void UUMediaTextureTarget::SetTextureParameterName(FName InTextureParameterName)
{
	TextureParameterName = InTextureParameterName;
}

bool UUMediaTextureTarget::ApplyMediaTexture()
{
	if (!TargetMesh)
	{
		UE_LOG(LogUltiUnrealTexture, Warning, TEXT("ApplyMediaTexture: TargetMesh is null"));
		return false;
	}

	if (TextureParameterName.IsNone())
	{
		UE_LOG(LogUltiUnrealTexture, Warning, TEXT("ApplyMediaTexture: TextureParameterName is None"));
		return false;
	}

	if (!MediaTexture)
	{
		UE_LOG(LogUltiUnrealTexture, Warning, TEXT("ApplyMediaTexture: MediaTexture is null"));
		return false;
	}

	const int32 NumMats = TargetMesh->GetNumMaterials();
	if (MaterialIndex < 0 || MaterialIndex >= NumMats)
	{
		UE_LOG(LogUltiUnrealTexture, Warning, TEXT("ApplyMediaTexture: invalid MaterialIndex=%d (Num=%d)"), MaterialIndex, NumMats);
		return false;
	}

	UMaterialInstanceDynamic* MID = Cast<UMaterialInstanceDynamic>(TargetMesh->GetMaterial(MaterialIndex));
	if (!MID)
	{
		MID = TargetMesh->CreateAndSetMaterialInstanceDynamic(MaterialIndex);
	}
	if (!MID)
	{
		UE_LOG(LogUltiUnrealTexture, Warning, TEXT("ApplyMediaTexture: failed to get/create MID"));
		return false;
	}

	MID->SetTextureParameterValue(TextureParameterName, MediaTexture);
	return true;
}

bool UUMediaTextureTarget::SetMediaFromFile(const FString& FileUrl)
{
	// SetMediaFromFileEx() already creates/opens the media source.
	// Calling OpenSource here would open twice.
	return SetMediaFromFileEx(FileUrl, true, true, true);
}

bool UUMediaTextureTarget::SetMediaFromFileEx(const FString& FileUrl, bool bAutoPlay, bool bLoop, bool bClosePrevious)
{
	const FString FullPath = UU_NormalizeFileUrlToPath_MediaTarget(FileUrl);

	if (FullPath.IsEmpty() || !FPaths::FileExists(FullPath))
	{
		UE_LOG(LogUltiUnrealTexture, Warning, TEXT("SetMediaFromFile: file not found: %s"), *FullPath);
		return false;
	}

	if (!MediaPlayer)
	{
		MediaPlayer = NewObject<UMediaPlayer>(this);
	}

	if (bClosePrevious)
	{
		MediaPlayer->Close(); // 🔥 le point clé
	}

	MediaPlayer->OnMediaOpened.RemoveAll(this);
	MediaPlayer->OnMediaOpened.AddDynamic(this, &UUMediaTextureTarget::HandleMediaOpened);

	MediaPlayer->OnMediaOpenFailed.RemoveAll(this);
	MediaPlayer->OnMediaOpenFailed.AddDynamic(this, &UUMediaTextureTarget::HandleMediaOpenFailed);

	MediaPlayer->SetLooping(bLoop);
	bAutoPlayOnOpen = bAutoPlay;

	if (!MediaTexture)
	{
		MediaTexture = NewObject<UMediaTexture>(this);
	}
	MediaTexture->SetMediaPlayer(MediaPlayer);
	MediaTexture->UpdateResource();

	// 🔥 recréer une nouvelle source à chaque fois (sinon UE “cache” parfois l’ancienne)
	MediaSource = NewObject<UFileMediaSource>(this);
	MediaSource->FilePath = FullPath;

	if (!ApplyMediaTexture())
	{
		return false;
	}

	const bool bOpened = MediaPlayer->OpenSource(MediaSource);
	if (!bOpened)
	{
		UE_LOG(LogUltiUnrealTexture, Warning, TEXT("SetMediaFromFile: OpenSource failed: %s"), *FullPath);
		return false;
	}

	return true;
}

void UUMediaTextureTarget::HandleMediaOpened(FString OpenedUrl)
{
	OnOpened.Broadcast(OpenedUrl);

	if (MediaPlayer && bAutoPlayOnOpen)
	{
		MediaPlayer->Play();
	}
}

void UUMediaTextureTarget::HandleMediaOpenFailed(FString FailedUrl)
{
	UE_LOG(LogUltiUnrealTexture, Warning, TEXT("SetMediaFromFile: OpenFailed: %s"), *FailedUrl);
	OnFailed.Broadcast(FailedUrl);
}

