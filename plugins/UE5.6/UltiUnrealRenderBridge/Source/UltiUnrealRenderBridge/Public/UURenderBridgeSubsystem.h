// Copyright 2025 Julien Darras. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Containers/Ticker.h"
#include "Dom/JsonValue.h"
#include "Interfaces/IHttpRequest.h"
#include "Interfaces/IHttpResponse.h"
#include "Subsystems/GameInstanceSubsystem.h"

#include "UURenderBridgeSubsystem.generated.h"

class FJsonObject;

UCLASS()
class ULTIUNREALRENDERBRIDGE_API UURenderBridgeSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    virtual bool ShouldCreateSubsystem(UObject* Outer) const override;
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;
    virtual void Deinitialize() override;

private:
    enum class EBridgePhase : uint8
    {
        Idle,
        WaitingForRemoteControl,
        WaitingForPreset,
        ApplyingFields,
        Completed,
        Failed
    };

    struct FPendingPropertyUpdate
    {
        FString PropertyName;
        TSharedPtr<FJsonValue> PropertyValue;
        int32 AttemptCount = 0;
    };

    bool ReadCommandLine(FString& OutErrorCode, FString& OutErrorMessage);
    bool ValidateConfiguration(FString& OutErrorCode, FString& OutErrorMessage) const;
    bool DecodeBase64JsonObject(const FString& InBase64, TSharedPtr<FJsonObject>& OutObject, FString& OutError) const;
    bool DecodeUtf8JsonObject(const FString& InJsonUtf8OrText, TSharedPtr<FJsonObject>& OutObject, FString& OutError) const;
    bool BuildPendingUpdates(FString& OutErrorCode, FString& OutErrorMessage);
    bool LoadMetadataFromRenderJob();
    bool CoercePropertyValue(const FString& PropertyName, const TSharedPtr<FJsonValue>& InValue, TSharedPtr<FJsonValue>& OutValue, FString& OutError) const;
    bool CoerceValueAsType(const FString& TypeName, const TSharedPtr<FJsonValue>& InValue, TSharedPtr<FJsonValue>& OutValue, FString& OutError) const;
    bool JsonValueToNumber(const TSharedPtr<FJsonValue>& InValue, double& OutNumber) const;
    bool JsonValueToBool(const TSharedPtr<FJsonValue>& InValue, bool& bOutBool) const;
    bool JsonValueToObject(const TSharedPtr<FJsonValue>& InValue, TSharedPtr<FJsonObject>& OutObject) const;

    void StartBridge();
    void ProbeRemoteControlInfo();
    void HandleRemoteControlInfoResponse(FHttpRequestPtr Request, FHttpResponsePtr Response, bool bWasSuccessful);
    void ProbePreset();
    void HandlePresetResponse(FHttpRequestPtr Request, FHttpResponsePtr Response, bool bWasSuccessful);
    void BeginApplyingProperties();
    void ProcessCurrentProperty();
    void HandlePropertyResponse(FHttpRequestPtr Request, FHttpResponsePtr Response, bool bWasSuccessful);
    void HandlePostLoadMap(UWorld* LoadedWorld);
    void SignalReadyToRender();

    void ScheduleNext(float DelaySeconds, TFunction<void()>&& InCallback);
    void ClearTicker();
    void CancelActiveRequest();
    void FailBridge(const FString& ErrorCode, const FString& Message, const FString& PropertyName = FString(), int32 HttpCode = 0);

    bool IsStartupTimedOut() const;
    bool IsRetriableHttpCode(int32 HttpCode) const;
    bool ResponseLooksLikeBindingNotReady(const FString& ResponseBody) const;
    bool ResponseLooksLikeTypeMismatch(const FString& ResponseBody) const;
    float GetRetryDelaySeconds(int32 AttemptCount) const;

    FString UrlEncode(const FString& InValue) const;
    FString SerializeJsonValue(const TSharedPtr<FJsonValue>& InValue) const;
    FString GetResponseBody(const FHttpResponsePtr& Response) const;
    FString GetPhaseName() const;
    void LogEvent(ELogVerbosity::Type Verbosity, const FString& EventName, const FString& Message, const FString* PropertyName = nullptr, int32 HttpCode = 0, int32 Attempt = INDEX_NONE) const;

private:
    FTSTicker::FDelegateHandle TickerHandle;
    FDelegateHandle PostLoadMapHandle;
    TSharedPtr<IHttpRequest, ESPMode::ThreadSafe> ActiveRequest;

    FString RemoteControlBaseUrl = TEXT("http://127.0.0.1:30010");
    FString PresetName;
    FString FormDataB64;
    FString RenderJobB64;
    FString JobId;
    FString FormId;

    TSharedPtr<FJsonObject> FormDataObject;
    TSharedPtr<FJsonObject> RenderJobObject;
    TMap<FString, FString> DeclaredPropertyTypes;
    TArray<FPendingPropertyUpdate> PendingUpdates;

    int32 SchemaVersion = 1;
    int32 CurrentIndex = 0;
    int32 StartupAttemptCount = 0;
    int32 MaxRetriesPerField = 3;

    bool bGenerateTransaction = true;
    bool bContinueOnFieldFailure = false;

    float InitialDelaySeconds = 0.25f;
    float RetryDelaySeconds = 0.35f;
    float MaxRetryDelaySeconds = 2.0f;
    float StartupTimeoutSeconds = 30.0f;
    float RequestTimeoutSeconds = 10.0f;

    double StartTimestampSeconds = 0.0;
    EBridgePhase Phase = EBridgePhase::Idle;
};
