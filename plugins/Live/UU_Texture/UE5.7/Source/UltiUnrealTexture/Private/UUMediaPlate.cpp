// Copyright 2026 Julien Darras. All Rights Reserved.

#include "UUMediaPlate.h"

#include "Components/StaticMeshComponent.h"
#include "FileMediaSource.h"
#include "MediaPlateComponent.h"
#include "MediaPlayer.h"
#include "MediaSoundComponent.h"
#include "MediaTexture.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "StreamMediaSource.h"
#include "TimerManager.h"
#include "UltiUnrealTexture.h"
#include "Misc/Paths.h"
#include "UObject/EnumProperty.h"
#include "Engine/World.h"
#if WITH_EDITOR
#include "Containers/Ticker.h"
#endif

AUUMediaPlate::AUUMediaPlate()
{
	PrimaryActorTick.bCanEverTick = true;
	PrimaryActorTick.bStartWithTickEnabled = true;
}

void AUUMediaPlate::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

#if WITH_EDITOR
	if (UWorld* World = GetWorld())
	{
		if (!World->IsGameWorld())
		{
			// Aide le MediaPlayer à progresser hors PIE (souvent bloqué sans tick editor)
			if (state == EUUMediaPlateState::Cueing && pending_player && !pending_player->IsPlaying())
			{
				pending_player->Play();
			}
		}
	}
#endif
}

void AUUMediaPlate::BeginPlay()
{
	Super::BeginPlay();

	ensure_initialized();

	if (MediaPlateComponent)
	{
		MediaPlateComponent->bAutoPlay = false;
		MediaPlateComponent->bPlayOnOpen = false;
		MediaPlateComponent->Close();
	}

	if (autoplay_on_begin_play)
	{
		const FString src = normalize_source(source_path);
		if (!src.IsEmpty())
		{
			if (debug_logs)
			{
				UE_LOG(LogUltiUnrealTexture, Log, TEXT("UU Media Plate: BeginPlay autoplay source='%s'"), *src);
			}
			Play();
		}
	}
}

#if WITH_EDITOR
void AUUMediaPlate::PostEditChangeProperty(FPropertyChangedEvent& PropertyChangedEvent)
{
	Super::PostEditChangeProperty(PropertyChangedEvent);

	cue_offset = normalize_offset_display(cue_offset);
}
#endif

void AUUMediaPlate::set_state(EUUMediaPlateState new_state)
{
	if (state == new_state)
	{
		return;
	}

	if (debug_logs)
	{
		const UEnum* E = StaticEnum<EUUMediaPlateState>();
		const FString OldName = E ? E->GetNameStringByValue((int64)state) : FString::FromInt((int32)state);
		const FString NewName = E ? E->GetNameStringByValue((int64)new_state) : FString::FromInt((int32)new_state);
		UE_LOG(LogUltiUnrealTexture, Log, TEXT("UU Media Plate: state %s -> %s"), *OldName, *NewName);
	}

	state = new_state;
}

void AUUMediaPlate::ensure_initialized()
{
	if (!active_player)
	{
		active_player = NewObject<UMediaPlayer>(this);
	}
	if (!pending_player)
	{
		pending_player = NewObject<UMediaPlayer>(this);
	}

	if (!active_texture)
	{
		active_texture = NewObject<UMediaTexture>(this);
		active_texture->SetMediaPlayer(active_player);
		active_texture->UpdateResource();
	}

	if (!pending_texture)
	{
		pending_texture = NewObject<UMediaTexture>(this);
		pending_texture->SetMediaPlayer(pending_player);
		pending_texture->UpdateResource();
	}

	// Bind the active texture to ALL material slots (front/back, etc.)
	apply_texture_to_plate(active_texture);

	if (MediaPlateComponent && MediaPlateComponent->SoundComponent)
	{
		MediaPlateComponent->SoundComponent->SetMediaPlayer(enable_audio ? active_player : nullptr);
		const float vol = (!enable_audio || mute) ? 0.0f : volume;
		MediaPlateComponent->SoundComponent->SetVolumeMultiplier(vol);
	}
}

void AUUMediaPlate::apply_texture_to_plate(UMediaTexture* tex)
{
	if (!StaticMeshComponent || !tex)
	{
		if (debug_logs)
		{
			UE_LOG(LogUltiUnrealTexture, Warning, TEXT("UU Media Plate: apply_texture_to_plate skipped (mesh or texture missing)"));
		}
		return;
	}

	const int32 NumMats = StaticMeshComponent->GetNumMaterials();
	if (NumMats <= 0)
	{
		if (debug_logs)
		{
			UE_LOG(LogUltiUnrealTexture, Warning, TEXT("UU Media Plate: StaticMeshComponent has no materials"));
		}
		return;
	}

	for (int32 i = 0; i < NumMats; ++i)
	{
		UMaterialInterface* Mat = StaticMeshComponent->GetMaterial(i);
		if (!Mat) continue;

		UMaterialInstanceDynamic* MID = Cast<UMaterialInstanceDynamic>(Mat);
		if (!MID)
		{
			MID = UMaterialInstanceDynamic::Create(Mat, this);
			StaticMeshComponent->SetMaterial(i, MID);
		}
		if (!MID) continue;

		MID->SetTextureParameterValue(texture_parameter, tex);
	}
}

FString AUUMediaPlate::normalize_source(const FString& in) const
{
	FString s = in;
	s.TrimStartAndEndInline();
	s.ReplaceInline(TEXT("\""), TEXT(""));
	s.ReplaceInline(TEXT("\\"), TEXT("/")); // C:\temp\test.mp4 -> C:/temp/test.mp4
	return s;
}

FString AUUMediaPlate::normalize_file_path(const FString& in) const
{
	FString s = normalize_source(in);
	if (s.IsEmpty()) return s;

	// Handle file:// URLs (file:///D:/...)
	if (s.StartsWith(TEXT("file://"), ESearchCase::IgnoreCase))
	{
		s.RightChopInline(7); // remove "file://"
		// Windows: file:///D:/... -> "/D:/..." then strip first '/'
		if (s.StartsWith(TEXT("/")) && s.Len() >= 3 && FChar::IsAlpha(s[1]) && s[2] == ':')
		{
			s.RightChopInline(1);
		}
	}

	// Convert relative -> absolute
	if (FPaths::IsRelative(s))
	{
		s = FPaths::ConvertRelativePathToFull(s);
	}

	FPaths::NormalizeFilename(s);
	return s;
}

FString AUUMediaPlate::normalize_offset_display(const FString& in) const
{
	FString s = in;
	s.TrimStartAndEndInline();
	s.ReplaceInline(TEXT("."), TEXT(":"));

	if (s.IsEmpty())
	{
		return TEXT("00:00:00:00");
	}

	bool is_seconds = false;
	if (s.EndsWith(TEXT("s"), ESearchCase::IgnoreCase))
	{
		is_seconds = true;
		s.LeftChopInline(1);
		s.TrimStartAndEndInline();
	}

	TArray<FString> parts;
	s.ParseIntoArray(parts, TEXT(":"), true);

	int32 h = 0, m = 0, sec = 0, f = 0;

	auto to_int = [](const FString& p) -> int32 { return FCString::Atoi(*p); };

	if (!is_seconds)
	{
		const int32 n = parts.Num();
		if (n >= 1) f = to_int(parts[n - 1]);
		if (n >= 2) sec = to_int(parts[n - 2]);
		if (n >= 3) m = to_int(parts[n - 3]);
		if (n >= 4) h = to_int(parts[n - 4]);
	}
	else
	{
		const float fps = use_manual_fps ? manual_fps : 25.0f;
		const float seconds_f = FCString::Atof(*s);
		const int32 total_sec = FMath::FloorToInt(seconds_f);
		const float frac = seconds_f - (float)total_sec;
		const int32 frames = FMath::RoundToInt(frac * fps);

		h = total_sec / 3600;
		m = (total_sec % 3600) / 60;
		sec = total_sec % 60;
		f = frames;
	}

	return FString::Printf(TEXT("%02d:%02d:%02d:%02d"), h, m, sec, f);
}

float AUUMediaPlate::get_effective_fps(UMediaPlayer* player_if_open) const
{
	if (use_manual_fps)
	{
		return FMath::Max(1.0f, manual_fps);
	}

	if (player_if_open)
	{
		const float fr = player_if_open->GetVideoTrackFrameRate(INDEX_NONE, INDEX_NONE);
		if (fr > 1.0f && fr < 1000.0f)
		{
			return fr;
		}
	}

	return (last_known_fps > 1.0f) ? last_known_fps : 25.0f;
}

FTimespan AUUMediaPlate::offset_to_timespan(const FString& in, float fps, bool& ok) const
{
	ok = false;

	const FString disp = normalize_offset_display(in);
	TArray<FString> parts;
	disp.ParseIntoArray(parts, TEXT(":"), true);
	if (parts.Num() != 4) return FTimespan::Zero();

	const int32 h = FCString::Atoi(*parts[0]);
	const int32 m = FCString::Atoi(*parts[1]);
	const int32 s = FCString::Atoi(*parts[2]);
	const int32 f = FCString::Atoi(*parts[3]);

	const double total_seconds =
		(double)h * 3600.0 +
		(double)m * 60.0 +
		(double)s +
		((fps > 0.0) ? ((double)f / (double)fps) : 0.0);

	ok = true;
	return FTimespan::FromSeconds(total_seconds);
}

void AUUMediaPlate::reset_pending(bool close_player)
{
#if WITH_EDITOR
	if (editor_open_poll_handle.IsValid())
	{
		FTSTicker::GetCoreTicker().RemoveTicker(editor_open_poll_handle);
		editor_open_poll_handle = FTSTicker::FDelegateHandle();
	}
#endif

	autoplay_after_cue = false;
	pending_source = nullptr;

	if (pending_player)
	{
		pending_player->OnMediaOpened.RemoveAll(this);
		pending_player->OnMediaOpenFailed.RemoveAll(this);

		if (close_player)
		{
			pending_player->Close();
		}
	}
}

void AUUMediaPlate::reset_active(bool close_player)
{
	active_source = nullptr;

	if (active_player && close_player)
	{
		active_player->Close();
	}

	if (MediaPlateComponent && MediaPlateComponent->SoundComponent)
	{
		MediaPlateComponent->SoundComponent->SetMediaPlayer(enable_audio ? active_player : nullptr);
		const float vol = (!enable_audio || mute) ? 0.0f : volume;
		MediaPlateComponent->SoundComponent->SetVolumeMultiplier(vol);
	}
}

void AUUMediaPlate::Cue()
{
	// Same behavior in Editor and in Game: load/open the source and DO NOT play.
	ensure_initialized();

#if WITH_EDITORONLY_DATA
	// Cue never auto-plays. (Play(Editor) uses editor_open_requested_play.)
	editor_autoplay_after_open = false;
#endif

#if WITH_EDITORONLY_DATA
	// Safety: if a previous Play() failed, ensure Cue never inherits that intent.
	editor_open_requested_play = false;
#endif

	// Do not let AMediaPlate internals auto-play
	if (MediaPlateComponent)
	{
		MediaPlateComponent->bAutoPlay = false;
		MediaPlateComponent->bPlayOnOpen = false;
	}

	reset_pending(true);

	const FString src = normalize_source(source_path);
	if (src.IsEmpty())
	{
		UE_LOG(LogUltiUnrealTexture, Warning, TEXT("UU Media Plate: Source is empty"));
		set_state(EUUMediaPlateState::Error);
		return;
	}

	set_state(EUUMediaPlateState::Cueing);
	start_pending_open();
}

void AUUMediaPlate::start_pending_open()
{
	const FString src = normalize_source(source_path);

	if (!pending_player)
	{
		UE_LOG(LogUltiUnrealTexture, Warning, TEXT("UU Media Plate: pending_player is null"));
		set_state(EUUMediaPlateState::Error);
		return;
	}

	if (src.StartsWith(TEXT("http://")) || src.StartsWith(TEXT("https://")) || src.StartsWith(TEXT("rtsp://")))
	{
		UStreamMediaSource* stream = NewObject<UStreamMediaSource>(this);
		stream->StreamUrl = src;
		pending_source = stream;

		if (debug_logs)
		{
			UE_LOG(LogUltiUnrealTexture, Log, TEXT("UU Media Plate: opening stream '%s'"), *src);
		}
	}
	else
	{
		UFileMediaSource* file = NewObject<UFileMediaSource>(this);

		const FString path_norm = normalize_file_path(src);

		// For UFileMediaSource on Windows, prefer platform filename (backslashes)
		FString path_for_media = path_norm;
		FPaths::MakePlatformFilename(path_for_media);

		if (path_for_media.IsEmpty() || !FPaths::FileExists(path_for_media))
		{
			UE_LOG(LogUltiUnrealTexture, Warning, TEXT("UU Media Plate: file not found or not accessible: %s"), *path_for_media);
			set_state(EUUMediaPlateState::Error);
			return;
		}

		file->FilePath = path_for_media;
		pending_source = file;

		if (debug_logs)
		{
			UE_LOG(LogUltiUnrealTexture, Log, TEXT("UU Media Plate: opening file '%s' (assigned='%s')"), *path_norm, *path_for_media);
		}
	}

	pending_player->OnMediaOpened.AddDynamic(this, &AUUMediaPlate::on_pending_media_opened);
	pending_player->OnMediaOpenFailed.AddDynamic(this, &AUUMediaPlate::on_pending_media_open_failed);

	pending_player->SetLooping(loop);

	if (debug_logs)
	{
		UE_LOG(LogUltiUnrealTexture, Log, TEXT("UU Media Plate: calling OpenSource..."));
	}

	const bool open_ok = pending_player->OpenSource(pending_source);

	if (debug_logs)
	{
		UE_LOG(LogUltiUnrealTexture, Log, TEXT("UU Media Plate: OpenSource=%s"), open_ok ? TEXT("true") : TEXT("false"));
	}

	// Si OpenSource a déclenché MediaOpened immédiatement, l'état peut avoir déjà changé.
	if (state != EUUMediaPlateState::Cueing)
	{
		return;
	}

#if WITH_EDITOR
	// Editor fallback: sometimes OnMediaOpened doesn't fire outside PIE.
	if (open_ok)
	{
		if (UWorld* World = GetWorld())
		{
			if (!World->IsGameWorld())
			{
				// Clear previous poll if any
				if (editor_open_poll_handle.IsValid())
				{
					FTSTicker::GetCoreTicker().RemoveTicker(editor_open_poll_handle);
					editor_open_poll_handle = FTSTicker::FDelegateHandle();
				}

				editor_open_poll_end_time = FPlatformTime::Seconds() + 5.0; // timeout

				TWeakObjectPtr<AUUMediaPlate> WeakThis(this);

				editor_open_poll_handle = FTSTicker::GetCoreTicker().AddTicker(
					FTickerDelegate::CreateLambda([WeakThis](float)
						{
							if (!WeakThis.IsValid())
							{
								return false;
							}

							AUUMediaPlate* Self = WeakThis.Get();
							if (!Self || !Self->pending_player || Self->state != EUUMediaPlateState::Cueing)
							{
								return false;
							}

							// If ready, force the normal "opened" flow
							if (Self->pending_player->IsReady())
							{
								if (Self->debug_logs)
								{
									UE_LOG(LogUltiUnrealTexture, Log, TEXT("UU Media Plate (Editor): pending player ready (poll). Forcing opened flow."));
								}

								Self->on_pending_media_opened(Self->pending_player->GetUrl());
								return false;
							}

							// Timeout
							if (FPlatformTime::Seconds() > Self->editor_open_poll_end_time)
							{
								UE_LOG(LogUltiUnrealTexture, Warning, TEXT("UU Media Plate (Editor): OpenSource did not reach MediaOpened within 5s."));
								Self->set_state(EUUMediaPlateState::Error);
								return false;
							}

							return true;
						}),
					0.05f
				);
			}
		}
	}
#endif

#if WITH_EDITOR
	// In Editor (non-PIE), kick the player so it actually progresses to MediaOpened.
	if (open_ok)
	{
		if (UWorld* World = GetWorld())
		{
			if (!World->IsGameWorld())
			{
				pending_player->Play(); // will be paused in on_pending_media_opened when it's a Cue
			}
		}
	}
#endif

	if (!open_ok)
	{
		UE_LOG(LogUltiUnrealTexture, Warning, TEXT("UU Media Plate: OpenSource returned false (src='%s')"), *src);
		set_state(EUUMediaPlateState::Error);
	}
}

void AUUMediaPlate::on_pending_media_open_failed(FString failed_url)
{
	UE_LOG(LogUltiUnrealTexture, Warning, TEXT("UU Media Plate: MediaOpenFailed: %s"), *failed_url);
	set_state(EUUMediaPlateState::Error);
}

#if WITH_EDITOR
void AUUMediaPlate::on_editor_media_opened(FString opened_url)
{
	if (debug_logs)
	{
		UE_LOG(LogUltiUnrealTexture, Log, TEXT("UU Media Plate (Editor): MediaOpened: %s"), *opened_url);
	}

	if (!active_player)
	{
		UE_LOG(LogUltiUnrealTexture, Warning, TEXT("UU Media Plate (Editor): active_player is null on MediaOpened"));
		set_state(EUUMediaPlateState::Error);
		return;
	}

	// Update fps memory
	{
		const float fr = active_player->GetVideoTrackFrameRate(INDEX_NONE, INDEX_NONE);
		if (fr > 1.0f && fr < 1000.0f)
		{
			last_known_fps = fr;
		}
	}

	// Seek to cue offset
	{
		bool ok = false;
		const float fps = get_effective_fps(active_player);
		const FTimespan ts = offset_to_timespan(cue_offset, fps, ok);
		if (ok)
		{
			active_player->Seek(ts);
		}
	}

	// Editor: start playback only if Play(Editor) requested; otherwise keep paused (Cue)
	if (editor_autoplay_after_open)
	{
		editor_autoplay_after_open = false;
		active_player->Play();
		set_state(EUUMediaPlateState::Playing);
	}
	else
	{
		// Cue(Editor) = chargé mais PAUSE (pas de lecture)
		active_player->Pause();
		set_state(EUUMediaPlateState::CuedReady);

		if (debug_logs)
		{
			UE_LOG(LogUltiUnrealTexture, Log, TEXT("UU Media Plate (Editor): Cue ready (paused, no playback)"));
		}
	}
}

void AUUMediaPlate::on_editor_media_open_failed(FString failed_url)
{
	UE_LOG(LogUltiUnrealTexture, Warning, TEXT("UU Media Plate (Editor): MediaOpenFailed: %s"), *failed_url);
	editor_autoplay_after_open = false;
	set_state(EUUMediaPlateState::Error);
}
#endif

#if WITH_EDITOR
void AUUMediaPlate::editor_pause_after_prewarm()
{
	// If something changed since we scheduled (ex: user hit Play), don't force pause
	if (state != EUUMediaPlateState::Cueing)
	{
		return;
	}

	if (!active_player)
	{
		return;
	}

	active_player->Pause();
	set_state(EUUMediaPlateState::CuedReady);

	if (debug_logs)
	{
		UE_LOG(LogUltiUnrealTexture, Log, TEXT("UU Media Plate (Editor): paused after prewarm (Cue ready)"));
	}
}
#endif

void AUUMediaPlate::pause_pending_after_prewarm()
{
	if (!pending_player) return;

	pending_player->Pause();
	set_state(EUUMediaPlateState::CuedReady);

	if (autoplay_after_cue)
	{
		autoplay_after_cue = false;
		swap_to_pending_and_play();
	}
}

void AUUMediaPlate::on_pending_media_opened(FString opened_url)
{
	if (debug_logs)
	{
		UE_LOG(LogUltiUnrealTexture, Log, TEXT("UU Media Plate: MediaOpened: %s"), *opened_url);
	}

	if (!pending_player)
	{
		UE_LOG(LogUltiUnrealTexture, Warning, TEXT("UU Media Plate: pending_player is null on MediaOpened"));
		set_state(EUUMediaPlateState::Error);
		return;
	}

	// Update fps memory
	{
		const float fr = pending_player->GetVideoTrackFrameRate(INDEX_NONE, INDEX_NONE);
		if (fr > 1.0f && fr < 1000.0f)
		{
			last_known_fps = fr;
		}
	}

	// Seek to cue offset (works for files; may fail for some streams, that's fine)
	{
		bool ok = false;
		const float fps = get_effective_fps(pending_player);
		const FTimespan ts = offset_to_timespan(cue_offset, fps, ok);
		if (ok)
		{
			pending_player->Seek(ts);
		}
	}

	// Decide if we should auto-play:
	// - Runtime Play() sets autoplay_after_cue
	// - Editor Play() sets editor_open_requested_play
	bool bEditorWantsPlay = false;
#if WITH_EDITORONLY_DATA
	if (UWorld* World = GetWorld())
	{
		bEditorWantsPlay = (!World->IsGameWorld() && editor_open_requested_play);
	}
#endif

	const bool bAutoPlay = autoplay_after_cue || bEditorWantsPlay;

	autoplay_after_cue = false;
#if WITH_EDITORONLY_DATA
	editor_open_requested_play = false;
#endif

	if (bAutoPlay)
	{
		swap_to_pending_and_play();
		return;
	}

	// Cue = loaded, paused, ready (NO PLAY)
	pending_player->Pause();
	set_state(EUUMediaPlateState::CuedReady);
}

void AUUMediaPlate::swap_to_pending_and_play()
{
	ensure_initialized();

	Swap(active_player, pending_player);
	Swap(active_texture, pending_texture);
	Swap(active_source, pending_source);

	// Safety: rebind texture to player and refresh resource after swaps
	if (active_texture && active_player)
	{
		active_texture->SetMediaPlayer(active_player);
		active_texture->UpdateResource();
	}

	apply_texture_to_plate(active_texture);

	if (MediaPlateComponent && MediaPlateComponent->SoundComponent)
	{
		MediaPlateComponent->SoundComponent->SetMediaPlayer(enable_audio ? active_player : nullptr);
		const float vol = (!enable_audio || mute) ? 0.0f : volume;
		MediaPlateComponent->SoundComponent->SetVolumeMultiplier(vol);
	}

	active_player->SetLooping(loop);
	active_player->Play();

	if (pending_player)
	{
		pending_player->Close();
	}

	set_state(EUUMediaPlateState::Playing);
}

void AUUMediaPlate::Play()
{
#if WITH_EDITOR
	if (UWorld* World = GetWorld())
	{
		if (!World->IsGameWorld())
		{
			ensure_initialized();

			// If a Cue() is still opening, request autoplay when it finishes.
			if (state == EUUMediaPlateState::Cueing)
			{
				editor_open_requested_play = true;

				if (debug_logs)
				{
					UE_LOG(LogUltiUnrealTexture, Log, TEXT("UU Media Plate (Editor): Play requested while opening (Cueing). Will auto-play on MediaOpened."));
				}

				return;
			}

			// If we already have a cued (opened+paused) media, it lives on the *pending* side.
			if (state == EUUMediaPlateState::CuedReady)
			{
				swap_to_pending_and_play();
				return;
			}

			// Otherwise: open like Cue, but request autoplay when open completes.
			editor_open_requested_play = true;
			Cue();
			editor_open_requested_play = true; // <-- IMPORTANT : Cue() le remet à false, on le réaffirme
			return;
		}
	}
#endif

	ensure_initialized();

	if (state == EUUMediaPlateState::CuedReady)
	{
		swap_to_pending_and_play();
		return;
	}

	reset_pending(true);
	autoplay_after_cue = true;

	const FString src = normalize_source(source_path);
	if (src.IsEmpty())
	{
		UE_LOG(LogUltiUnrealTexture, Warning, TEXT("UU Media Plate: Source is empty"));
		set_state(EUUMediaPlateState::Error);
		return;
	}

	set_state(EUUMediaPlateState::Cueing);
	start_pending_open();

}

void AUUMediaPlate::Stop()
{
	ensure_initialized();
	set_state(EUUMediaPlateState::Stopping);

	if (active_player)
	{
		active_player->Close();
	}
	if (pending_player)
	{
		pending_player->Close();
	}

	set_state(EUUMediaPlateState::Idle);
}
