// Copyright 2026 Julien Darras. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "MediaPlate.h"
#include "TimerManager.h"

#if WITH_EDITOR
#include "Containers/Ticker.h"
#endif

#include "UUMediaPlate.generated.h"

class UMediaPlayer;
class UMediaTexture;
class UMediaSource;

UENUM(BlueprintType)
enum class EUUMediaPlateState : uint8
{
	Idle      UMETA(DisplayName = "Idle"),
	Cueing    UMETA(DisplayName = "Cueing"),
	CuedReady UMETA(DisplayName = "CuedReady"),
	Playing   UMETA(DisplayName = "Playing"),
	Stopping  UMETA(DisplayName = "Stopping"),
	Error     UMETA(DisplayName = "Error")
};

UCLASS(BlueprintType, Blueprintable, meta = (DisplayName = "UU Media Plate"),
	HideCategories = ("MediaPlate", "Playlist", "Media", "Rendering", "Replication", "Input", "Collision", "Actor"))
	class ULTIUNREALTEXTURE_API AUUMediaPlate : public AMediaPlate
{
	GENERATED_BODY()

public:
	AUUMediaPlate();

	virtual void Tick(float DeltaSeconds) override;

#if WITH_EDITOR
	virtual bool ShouldTickIfViewportsOnly() const override { return true; }
#endif

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UU Media Plate|Source", meta = (DisplayName = "Source"))
	FString source_path;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UU Media Plate|Rendering", meta = (DisplayName = "Texture Parameter"))
	FName texture_parameter = TEXT("MediaTexture");

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UU Media Plate|Playback", meta = (DisplayName = "Autoplay On BeginPlay"))
	bool autoplay_on_begin_play = false;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UU Media Plate|Debug", meta = (DisplayName = "Debug Logs"))
	bool debug_logs = true;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UU Media Plate|Cue", meta = (DisplayName = "Cue Offset"))
	FString cue_offset = TEXT("00:00:00:00");

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UU Media Plate|Playback", meta = (DisplayName = "Loop"))
	bool loop = false;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UU Media Plate|Audio", meta = (DisplayName = "Enable Audio"))
	bool enable_audio = true;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UU Media Plate|Audio", meta = (DisplayName = "Volume", ClampMin = "0.0"))
	float volume = 1.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UU Media Plate|Audio", meta = (DisplayName = "Mute"))
	bool mute = false;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UU Media Plate")
	bool use_manual_fps = false;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UU Media Plate", meta = (EditCondition = "use_manual_fps", ClampMin = "1.0", ClampMax = "240.0"))
	float manual_fps = 25.0f;

	UFUNCTION(BlueprintCallable, CallInEditor, Category = "UU Media Plate|Actions")
	void Cue();

	UFUNCTION(BlueprintCallable, CallInEditor, Category = "UU Media Plate|Actions")
	void Play();

	UFUNCTION(BlueprintCallable, CallInEditor, Category = "UU Media Plate|Actions")
	void Stop();

	UFUNCTION(BlueprintPure, Category = "UU Media Plate")
	EUUMediaPlateState get_state() const { return state; }

protected:
	virtual void BeginPlay() override;

#if WITH_EDITOR
	virtual void PostEditChangeProperty(FPropertyChangedEvent& PropertyChangedEvent) override;
#endif

private:
	UPROPERTY(Transient)
	EUUMediaPlateState state = EUUMediaPlateState::Idle;

	UPROPERTY(Transient)
	bool autoplay_after_cue = false;

	UPROPERTY(Transient)
	float last_known_fps = 25.0f;

#if WITH_EDITORONLY_DATA
	bool editor_autoplay_after_open = false;
	bool editor_open_requested_play = false;
	FTimerHandle editor_pause_timer_handle;
#endif

#if WITH_EDITORONLY_DATA
	FTSTicker::FDelegateHandle editor_open_poll_handle;
	double editor_open_poll_end_time = 0.0;
#endif

#if WITH_EDITOR
	void editor_pause_after_prewarm();
#endif

	UPROPERTY(Transient)
	TObjectPtr<UMediaPlayer> active_player = nullptr;

	UPROPERTY(Transient)
	TObjectPtr<UMediaPlayer> pending_player = nullptr;

	UPROPERTY(Transient)
	TObjectPtr<UMediaTexture> active_texture = nullptr;

	UPROPERTY(Transient)
	TObjectPtr<UMediaTexture> pending_texture = nullptr;

	UPROPERTY(Transient)
	TObjectPtr<UMediaSource> active_source = nullptr;

	UPROPERTY(Transient)
	TObjectPtr<UMediaSource> pending_source = nullptr;

	void ensure_initialized();
	void set_state(EUUMediaPlateState new_state);
	void apply_texture_to_plate(UMediaTexture* tex);

	FString normalize_source(const FString& in) const;
	FString normalize_file_path(const FString& in) const;
	FString normalize_offset_display(const FString& in) const;

	float get_effective_fps(UMediaPlayer* player_if_open) const;
	FTimespan offset_to_timespan(const FString& in, float fps, bool& ok) const;

	void start_pending_open();
	void reset_pending(bool close_player);
	void reset_active(bool close_player);

	void swap_to_pending_and_play();
	void pause_pending_after_prewarm();

	UFUNCTION()
	void on_pending_media_opened(FString opened_url);

	UFUNCTION()
	void on_pending_media_open_failed(FString failed_url);

	UFUNCTION()
	void on_editor_media_opened(FString opened_url);

	UFUNCTION()
	void on_editor_media_open_failed(FString failed_url);
};
