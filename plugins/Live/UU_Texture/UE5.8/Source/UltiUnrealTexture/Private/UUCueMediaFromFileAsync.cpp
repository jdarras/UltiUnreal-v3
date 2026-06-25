// Copyright 2026 Julien Darras. All Rights Reserved.

#include "UUCueMediaFromFileAsync.h"

#include "UObject/UObjectGlobals.h"

#include "FileMediaSource.h"
#include "MediaPlayer.h"
#include "MediaTexture.h"

#include "GenericPlatform/GenericPlatformHttp.h"
#include "HAL/FileManager.h"
#include "Misc/Paths.h"

UUCueMediaFromFileAsync* UUCueMediaFromFileAsync::UU_CueMediaFromFile(UObject* WorldContextObject, const FString& FileUrl)
{
	UObject* Outer = WorldContextObject ? WorldContextObject : GetTransientPackageAsObject();
	UUCueMediaFromFileAsync* Action = NewObject<UUCueMediaFromFileAsync>(Outer);

	Action->WorldContextObject = WorldContextObject;
	Action->RequestedUrl = FileUrl;
	Action->RegisterWithGameInstance(WorldContextObject);
	return Action;
}

void UUCueMediaFromFileAsync::Activate()
{
	FString Error;
	const FString FilePath = NormalizeFileUrlToPath(RequestedUrl, Error);

	if (FilePath.IsEmpty())
	{
		OnFailed.Broadcast(nullptr, nullptr, Error.IsEmpty() ? TEXT("UU Cue Media From File: invalid file url") : Error);
		FinishAndCleanup();
		return;
	}

	MediaPlayer = NewObject<UMediaPlayer>(this);
	MediaPlayer->PlayOnOpen = false;

	MediaTexture = NewObject<UMediaTexture>(this);
	MediaTexture->SetMediaPlayer(MediaPlayer);
	MediaTexture->UpdateResource();

	MediaSource = NewObject<UFileMediaSource>(this);
	MediaSource->FilePath = FilePath;

	MediaPlayer->OnMediaOpened.AddDynamic(this, &UUCueMediaFromFileAsync::HandleMediaOpened);
	MediaPlayer->OnMediaOpenFailed.AddDynamic(this, &UUCueMediaFromFileAsync::HandleMediaOpenFailed);

	if (!MediaPlayer->OpenSource(MediaSource))
	{
		HandleMediaOpenFailed(RequestedUrl);
	}
}

void UUCueMediaFromFileAsync::HandleMediaOpened(FString OpenedUrl)
{
	if (MediaPlayer)
	{
		MediaPlayer->SetRate(0.0f); // “pause dure”
		MediaPlayer->Rewind();
		MediaPlayer->SetRate(0.0f);
	}

	OnOpened.Broadcast(MediaPlayer, MediaTexture, OpenedUrl);
	FinishAndCleanup();
}

void UUCueMediaFromFileAsync::HandleMediaOpenFailed(FString FailedUrl)
{
	const FString Error = FString::Printf(TEXT("UU Cue Media From File: failed to open '%s'"), *FailedUrl);
	OnFailed.Broadcast(MediaPlayer, MediaTexture, Error);
	FinishAndCleanup();
}

void UUCueMediaFromFileAsync::FinishAndCleanup()
{
	if (MediaPlayer)
	{
		MediaPlayer->OnMediaOpened.RemoveAll(this);
		MediaPlayer->OnMediaOpenFailed.RemoveAll(this);
	}

	SetReadyToDestroy();
}

FString UUCueMediaFromFileAsync::NormalizeFileUrlToPath(const FString& FileUrl, FString& OutError) const
{
	FString S = FileUrl;
	S.TrimStartAndEndInline();

	if (S.IsEmpty())
	{
		OutError = TEXT("UU Cue Media From File: empty url");
		return FString();
	}

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

	int32 CutIndex = INDEX_NONE;
	if (S.FindChar(TEXT('?'), CutIndex))
	{
		S = S.Left(CutIndex);
	}
	if (S.FindChar(TEXT('#'), CutIndex))
	{
		S = S.Left(CutIndex);
	}
	S.TrimStartAndEndInline();

	// file://...
	const FString FileScheme = TEXT("file://");
	if (S.StartsWith(FileScheme, ESearchCase::IgnoreCase))
	{
		S = S.Mid(FileScheme.Len());
		// file:///C:/... -> C:/...
		while (S.StartsWith(TEXT("/")) && !S.StartsWith(TEXT("//")))
		{
			S = S.Mid(1);
		}
	}

	S = FGenericPlatformHttp::UrlDecode(S);

	S.ReplaceInline(TEXT("/"), TEXT("\\"));

	FString Path = S;

	const bool bHasDrive =
		(Path.Len() >= 2 && FChar::IsAlpha(Path[0]) && Path[1] == ':');
	const bool bIsUNC = Path.StartsWith(TEXT("\\\\"));

	if (!bHasDrive && !bIsUNC)
	{
		Path = FPaths::ConvertRelativePathToFull(Path);
	}

	FPaths::NormalizeFilename(Path);
	Path.ReplaceInline(TEXT("/"), TEXT("\\"));

	if (!IFileManager::Get().FileExists(*Path))
	{
		OutError = FString::Printf(TEXT("UU Cue Media From File: file not found: %s"), *Path);
		return FString();
	}

	return Path;
}
