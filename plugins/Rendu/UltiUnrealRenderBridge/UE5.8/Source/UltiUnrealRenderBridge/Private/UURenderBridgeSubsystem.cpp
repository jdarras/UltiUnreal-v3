// Copyright 2025 Julien Darras. All Rights Reserved.

#include "UURenderBridgeSubsystem.h"

#include "Containers/Ticker.h"
#include "Dom/JsonObject.h"
#include "GenericPlatform/GenericPlatformHttp.h"
#include "Http.h"
#include "HttpModule.h"
#include "Interfaces/IHttpResponse.h"
#include "Misc/Base64.h"
#include "Misc/CommandLine.h"
#include "Misc/DefaultValueHelper.h"
#include "Misc/Guid.h"
#include "Misc/Parse.h"
#include "Misc/Paths.h"
#include "Engine/World.h"
#include "MoviePipelineOutputSetting.h"
#include "MoviePipelinePrimaryConfig.h"
#include "MoviePipelineQueue.h"
#include "MoviePipelineSetting.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "UObject/UObjectIterator.h"

DEFINE_LOG_CATEGORY_STATIC(LogUURenderBridge, Log, All);

namespace
{
    bool ParseJsonObjectFromString(const FString& Json, TSharedPtr<FJsonObject>& OutObject)
    {
        TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Json);
        return FJsonSerializer::Deserialize(Reader, OutObject) && OutObject.IsValid();
    }

    FString NormalizeTypeName(const FString& InTypeName)
    {
        FString Out = InTypeName.TrimStartAndEnd().ToLower();
        Out.ReplaceInline(TEXT(" "), TEXT(""));
        return Out;
    }

    bool TryParseHexColorToLinear(const FString& InValue, double& OutR, double& OutG, double& OutB, double& OutA)
    {
        if (!InValue.StartsWith(TEXT("#")) || (InValue.Len() != 7 && InValue.Len() != 9))
        {
            return false;
        }

        const FColor Parsed = FColor::FromHex(InValue);
        OutR = static_cast<double>(Parsed.R) / 255.0;
        OutG = static_cast<double>(Parsed.G) / 255.0;
        OutB = static_cast<double>(Parsed.B) / 255.0;
        OutA = static_cast<double>(Parsed.A) / 255.0;
        return true;
    }

    bool TryGetCaseInsensitiveNumberField(const TSharedPtr<FJsonObject>& Object, const TCHAR* PreferredName, double& OutValue)
    {
        if (!Object.IsValid())
        {
            return false;
        }

        if (Object->TryGetNumberField(PreferredName, OutValue))
        {
            return true;
        }

        const FString LowerName = FString(PreferredName).ToLower();
        for (const TPair<FString, TSharedPtr<FJsonValue>>& Pair : Object->Values)
        {
            if (Pair.Key.ToLower() == LowerName && Pair.Value.IsValid() && Pair.Value->Type == EJson::Number)
            {
                OutValue = Pair.Value->AsNumber();
                return true;
            }
        }

        return false;
    }

    bool TryGetCaseInsensitiveStringField(const TSharedPtr<FJsonObject>& Object, const TCHAR* PreferredName, FString& OutValue)
    {
        if (!Object.IsValid())
        {
            return false;
        }

        if (Object->TryGetStringField(PreferredName, OutValue))
        {
            return true;
        }

        const FString LowerName = FString(PreferredName).ToLower();
        for (const TPair<FString, TSharedPtr<FJsonValue>>& Pair : Object->Values)
        {
            if (Pair.Key.ToLower() != LowerName || !Pair.Value.IsValid())
            {
                continue;
            }

            if (Pair.Value->Type == EJson::String)
            {
                OutValue = Pair.Value->AsString();
                return true;
            }

            if (Pair.Value->Type == EJson::Number)
            {
                OutValue = LexToString(Pair.Value->AsNumber());
                return true;
            }

            if (Pair.Value->Type == EJson::Boolean)
            {
                OutValue = Pair.Value->AsBool() ? TEXT("true") : TEXT("false");
                return true;
            }
        }

        return false;
    }
}

bool UURenderBridgeSubsystem::ShouldCreateSubsystem(UObject* Outer) const
{
    FString Dummy;
    return FParse::Value(FCommandLine::Get(), TEXT("UURenderPreset="), Dummy);
}

void UURenderBridgeSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);

    FString ErrorCode;
    FString ErrorMessage;
    if (!ReadCommandLine(ErrorCode, ErrorMessage))
    {
        FailBridge(ErrorCode, ErrorMessage);
        return;
    }

    ApplyRenderOutputOverrides();

    PostLoadMapHandle = FCoreUObjectDelegates::PostLoadMapWithWorld.AddUObject(this, &UURenderBridgeSubsystem::HandlePostLoadMap);
    StartBridge();
}

void UURenderBridgeSubsystem::Deinitialize()
{
    if (PostLoadMapHandle.IsValid())
    {
        FCoreUObjectDelegates::PostLoadMapWithWorld.Remove(PostLoadMapHandle);
        PostLoadMapHandle.Reset();
    }

    CancelActiveRequest();
    ClearTicker();

    PendingUpdates.Reset();
    FormDataObject.Reset();
    RenderJobObject.Reset();
    DeclaredPropertyTypes.Reset();

    Super::Deinitialize();
}

bool UURenderBridgeSubsystem::ReadCommandLine(FString& OutErrorCode, FString& OutErrorMessage)
{
    const TCHAR* Cmd = FCommandLine::Get();

    FParse::Value(Cmd, TEXT("UURemoteControlUrl="), RemoteControlBaseUrl);
    FParse::Value(Cmd, TEXT("UURenderPreset="), PresetName);
    FParse::Value(Cmd, TEXT("UURenderFormDataB64="), FormDataB64);
    FParse::Value(Cmd, TEXT("UURenderJobB64="), RenderJobB64);
    FParse::Value(Cmd, TEXT("UURenderOutputDir="), OutputDirectoryOverride);
    FParse::Value(Cmd, TEXT("UURenderBridgeStartupTimeout="), StartupTimeoutSeconds);
    FParse::Value(Cmd, TEXT("UURenderBridgeRequestTimeout="), RequestTimeoutSeconds);
    FParse::Value(Cmd, TEXT("UURenderBridgeRetryDelay="), RetryDelaySeconds);
    FParse::Value(Cmd, TEXT("UURenderBridgeMaxRetryDelay="), MaxRetryDelaySeconds);
    FParse::Value(Cmd, TEXT("UURenderBridgeInitialDelay="), InitialDelaySeconds);
    FParse::Value(Cmd, TEXT("UURenderBridgeMaxRetriesPerField="), MaxRetriesPerField);

    {
        FString ContinueOnFieldFailure;
        if (FParse::Value(Cmd, TEXT("UURenderBridgeContinueOnFieldFailure="), ContinueOnFieldFailure))
        {
            bContinueOnFieldFailure = ContinueOnFieldFailure == TEXT("1") || ContinueOnFieldFailure.Equals(TEXT("true"), ESearchCase::IgnoreCase);
        }
    }

    {
        FString GenerateTransactionOverride;
        if (FParse::Value(Cmd, TEXT("UURenderBridgeGenerateTransaction="), GenerateTransactionOverride))
        {
            bGenerateTransaction = GenerateTransactionOverride == TEXT("1") || GenerateTransactionOverride.Equals(TEXT("true"), ESearchCase::IgnoreCase);
        }
    }

    FString Error;
    if (!FormDataB64.IsEmpty())
    {
        if (!DecodeBase64JsonObject(FormDataB64, FormDataObject, Error))
        {
            OutErrorCode = TEXT("BRIDGE_JSON_INVALID");
            OutErrorMessage = FString::Printf(TEXT("Unable to decode -UURenderFormDataB64: %s"), *Error);
            return false;
        }
    }
    else
    {
        FString FormDataJson;
        if (FParse::Value(Cmd, TEXT("UURenderFormDataJson="), FormDataJson))
        {
            if (!DecodeUtf8JsonObject(FormDataJson, FormDataObject, Error))
            {
                OutErrorCode = TEXT("BRIDGE_JSON_INVALID");
                OutErrorMessage = FString::Printf(TEXT("Unable to parse -UURenderFormDataJson: %s"), *Error);
                return false;
            }
        }
    }

    if (!RenderJobB64.IsEmpty())
    {
        if (!DecodeBase64JsonObject(RenderJobB64, RenderJobObject, Error))
        {
            OutErrorCode = TEXT("BRIDGE_JSON_INVALID");
            OutErrorMessage = FString::Printf(TEXT("Unable to decode -UURenderJobB64: %s"), *Error);
            return false;
        }
    }

    if (!LoadMetadataFromRenderJob())
    {
        OutErrorCode = TEXT("BRIDGE_JSON_INVALID");
        OutErrorMessage = TEXT("renderJob metadata is invalid.");
        return false;
    }

    if (JobId.IsEmpty())
    {
        JobId = FGuid::NewGuid().ToString(EGuidFormats::DigitsWithHyphensLower);
    }

    if (!ValidateConfiguration(OutErrorCode, OutErrorMessage))
    {
        return false;
    }

    if (!BuildPendingUpdates(OutErrorCode, OutErrorMessage))
    {
        return false;
    }

    return true;
}

bool UURenderBridgeSubsystem::ValidateConfiguration(FString& OutErrorCode, FString& OutErrorMessage) const
{
    if (PresetName.TrimStartAndEnd().IsEmpty())
    {
        OutErrorCode = TEXT("BRIDGE_ARG_MISSING");
        OutErrorMessage = TEXT("Missing required argument -UURenderPreset.");
        return false;
    }

    if (!FormDataObject.IsValid() || FormDataObject->Values.Num() == 0)
    {
        OutErrorCode = TEXT("BRIDGE_ARG_MISSING");
        OutErrorMessage = TEXT("Missing or empty formData payload.");
        return false;
    }

    const FString TrimmedUrl = RemoteControlBaseUrl.TrimStartAndEnd();
    if (!(TrimmedUrl.StartsWith(TEXT("http://")) || TrimmedUrl.StartsWith(TEXT("https://"))))
    {
        OutErrorCode = TEXT("BRIDGE_ARG_INVALID");
        OutErrorMessage = FString::Printf(TEXT("Invalid -UURemoteControlUrl '%s'. Expected http:// or https:// URL."), *RemoteControlBaseUrl);
        return false;
    }

    if (StartupTimeoutSeconds <= 0.0f || RequestTimeoutSeconds <= 0.0f || RetryDelaySeconds <= 0.0f || MaxRetriesPerField < 0)
    {
        OutErrorCode = TEXT("BRIDGE_ARG_INVALID");
        OutErrorMessage = TEXT("One or more bridge timing arguments are invalid.");
        return false;
    }

    return true;
}

bool UURenderBridgeSubsystem::DecodeUtf8JsonObject(const FString& InJsonUtf8OrText, TSharedPtr<FJsonObject>& OutObject, FString& OutError) const
{
    if (InJsonUtf8OrText.IsEmpty())
    {
        OutError = TEXT("empty value");
        return false;
    }

    if (ParseJsonObjectFromString(InJsonUtf8OrText, OutObject))
    {
        return true;
    }

    TArray<uint8> Utf8Bytes;
    if (FBase64::Decode(InJsonUtf8OrText, Utf8Bytes) && Utf8Bytes.Num() > 0)
    {
        const FUTF8ToTCHAR Utf8(reinterpret_cast<const ANSICHAR*>(Utf8Bytes.GetData()), Utf8Bytes.Num());
        const FString JsonString(Utf8.Length(), Utf8.Get());
        if (ParseJsonObjectFromString(JsonString, OutObject))
        {
            return true;
        }
    }

    OutError = TEXT("invalid json payload");
    return false;
}

bool UURenderBridgeSubsystem::DecodeBase64JsonObject(const FString& InBase64, TSharedPtr<FJsonObject>& OutObject, FString& OutError) const
{
    if (InBase64.IsEmpty())
    {
        OutError = TEXT("empty value");
        return false;
    }

    TArray<uint8> DecodedBytes;
    if (!FBase64::Decode(InBase64, DecodedBytes) || DecodedBytes.Num() == 0)
    {
        OutError = TEXT("base64 decode failed");
        return false;
    }

    const FUTF8ToTCHAR Utf8(reinterpret_cast<const ANSICHAR*>(DecodedBytes.GetData()), DecodedBytes.Num());
    const FString JsonString(Utf8.Length(), Utf8.Get());

    if (!ParseJsonObjectFromString(JsonString, OutObject))
    {
        OutError = TEXT("json parse failed");
        return false;
    }

    return true;
}

bool UURenderBridgeSubsystem::LoadMetadataFromRenderJob()
{
    DeclaredPropertyTypes.Reset();

    if (!RenderJobObject.IsValid())
    {
        return true;
    }

    double SchemaVersionNumber = static_cast<double>(SchemaVersion);
    if (RenderJobObject->TryGetNumberField(TEXT("schemaVersion"), SchemaVersionNumber))
    {
        SchemaVersion = static_cast<int32>(SchemaVersionNumber);
    }
    RenderJobObject->TryGetStringField(TEXT("jobId"), JobId);

    const TSharedPtr<FJsonObject>* MetadataObject = nullptr;
    if (RenderJobObject->TryGetObjectField(TEXT("metadata"), MetadataObject) && MetadataObject != nullptr && MetadataObject->IsValid())
    {
        (*MetadataObject)->TryGetStringField(TEXT("formId"), FormId);
    }

    const TSharedPtr<FJsonObject>* OptionsObject = nullptr;
    if (RenderJobObject->TryGetObjectField(TEXT("options"), OptionsObject) && OptionsObject != nullptr && OptionsObject->IsValid())
    {
        (*OptionsObject)->TryGetBoolField(TEXT("generateTransaction"), bGenerateTransaction);
        (*OptionsObject)->TryGetBoolField(TEXT("continueOnFieldFailure"), bContinueOnFieldFailure);
    }

    const TSharedPtr<FJsonObject>* PropertyTypesObject = nullptr;
    if (RenderJobObject->TryGetObjectField(TEXT("propertyTypes"), PropertyTypesObject) && PropertyTypesObject != nullptr && PropertyTypesObject->IsValid())
    {
        for (const TPair<FString, TSharedPtr<FJsonValue>>& Pair : (*PropertyTypesObject)->Values)
        {
            if (Pair.Value.IsValid() && Pair.Value->Type == EJson::String)
            {
                DeclaredPropertyTypes.Add(Pair.Key, Pair.Value->AsString());
            }
        }
    }

    auto ReadOutputOverridesFromObject = [this](const TSharedPtr<FJsonObject>& SourceObject)
    {
        if (!SourceObject.IsValid())
        {
            return;
        }

        if (OutputDirectoryOverride.IsEmpty())
        {
            FString Candidate;
            if (TryGetCaseInsensitiveStringField(SourceObject, TEXT("outputDir"), Candidate))
            {
                OutputDirectoryOverride = Candidate.TrimStartAndEnd();
            }
        }

        if (OutputFileNameOverride.IsEmpty())
        {
            FString Candidate;
            if (TryGetCaseInsensitiveStringField(SourceObject, TEXT("expectedRenderName"), Candidate))
            {
                OutputFileNameOverride = Candidate.TrimStartAndEnd();
            }
        }

        if (OutputFileNameOverride.IsEmpty())
        {
            FString OutputPathCandidate;
            if (TryGetCaseInsensitiveStringField(SourceObject, TEXT("outputPath"), OutputPathCandidate))
            {
                OutputPathCandidate = OutputPathCandidate.TrimStartAndEnd();
                if (!OutputPathCandidate.IsEmpty())
                {
                    OutputFileNameOverride = FPaths::GetCleanFilename(OutputPathCandidate).TrimStartAndEnd();
                }
            }
        }
    };

    ReadOutputOverridesFromObject(RenderJobObject);

    const TSharedPtr<FJsonObject>* PayloadObject = nullptr;
    if (RenderJobObject->TryGetObjectField(TEXT("payload"), PayloadObject) && PayloadObject != nullptr && PayloadObject->IsValid())
    {
        ReadOutputOverridesFromObject(*PayloadObject);
    }

    return true;
}

bool UURenderBridgeSubsystem::ApplyRenderOutputOverrides()
{
    const FString CleanOutputDir = OutputDirectoryOverride.TrimStartAndEnd();
    const FString CleanOutputFile = OutputFileNameOverride.TrimStartAndEnd();

    if (CleanOutputDir.IsEmpty() && CleanOutputFile.IsEmpty())
    {
        return false;
    }

    const FString FileNameStem = CleanOutputFile.IsEmpty()
        ? FString()
        : FPaths::GetBaseFilename(CleanOutputFile);

    int32 UpdatedJobs = 0;
    for (TObjectIterator<UMoviePipelineExecutorJob> It; It; ++It)
    {
        UMoviePipelineExecutorJob* Job = *It;
        if (!IsValid(Job) || Job->HasAnyFlags(RF_ClassDefaultObject | RF_ArchetypeObject))
        {
            continue;
        }

        UMoviePipelinePrimaryConfig* JobConfig = Job->GetConfiguration();
        if (!IsValid(JobConfig))
        {
            continue;
        }

        UMoviePipelineOutputSetting* OutputSettings = JobConfig->FindSetting<UMoviePipelineOutputSetting>(true);
        if (!IsValid(OutputSettings))
        {
            OutputSettings = Cast<UMoviePipelineOutputSetting>(
                JobConfig->FindOrAddSettingByClass(UMoviePipelineOutputSetting::StaticClass(), true, false)
            );
        }
        if (!IsValid(OutputSettings))
        {
            continue;
        }

        bool bChanged = false;
        if (!CleanOutputDir.IsEmpty() && OutputSettings->OutputDirectory.Path != CleanOutputDir)
        {
            OutputSettings->OutputDirectory.Path = CleanOutputDir;
            bChanged = true;
        }

        if (!FileNameStem.IsEmpty() && OutputSettings->FileNameFormat != FileNameStem)
        {
            OutputSettings->FileNameFormat = FileNameStem;
            bChanged = true;
        }

        if (bChanged)
        {
            ++UpdatedJobs;
        }
    }

    if (UpdatedJobs > 0)
    {
        bOutputOverridesApplied = true;
        LogEvent(
            ELogVerbosity::Log,
            TEXT("output_override_applied"),
            FString::Printf(TEXT("Applied output overrides to %d job(s): dir='%s' file='%s'."), UpdatedJobs, *CleanOutputDir, *FileNameStem)
        );
        return true;
    }

    return false;
}

bool UURenderBridgeSubsystem::BuildPendingUpdates(FString& OutErrorCode, FString& OutErrorMessage)
{
    PendingUpdates.Reset();

    if (!FormDataObject.IsValid())
    {
        OutErrorCode = TEXT("BRIDGE_ARG_MISSING");
        OutErrorMessage = TEXT("formData object is missing.");
        return false;
    }

    TArray<FString> Keys;
	Keys.Reserve(FormDataObject->Values.Num());

	for (const auto& Pair : FormDataObject->Values)
	{
		Keys.Add(FString(*Pair.Key));
	}

	Keys.Sort([](const FString& A, const FString& B)
	{
		return A < B;
	});

	for (const FString& Key : Keys)
	{
		const TSharedPtr<FJsonValue> FoundValue = FormDataObject->TryGetField(Key);
		if (Key.TrimStartAndEnd().IsEmpty() || !FoundValue.IsValid())
		{
			continue;
		}

		TSharedPtr<FJsonValue> FinalValue;
		FString MappingError;
		if (!CoercePropertyValue(Key, FoundValue, FinalValue, MappingError))
        {
            OutErrorCode = TEXT("RC_PROPERTY_TYPE_MISMATCH");
            OutErrorMessage = FString::Printf(TEXT("Property '%s' could not be coerced: %s"), *Key, *MappingError);
            return false;
        }

        FPendingPropertyUpdate& Update = PendingUpdates.AddDefaulted_GetRef();
        Update.PropertyName = Key;
        Update.PropertyValue = FinalValue.IsValid() ? FinalValue : FoundValue;
    }

    if (PendingUpdates.Num() == 0)
    {
        OutErrorCode = TEXT("BRIDGE_ARG_MISSING");
        OutErrorMessage = TEXT("No form field found in formData.");
        return false;
    }

    return true;
}

bool UURenderBridgeSubsystem::CoercePropertyValue(const FString& PropertyName, const TSharedPtr<FJsonValue>& InValue, TSharedPtr<FJsonValue>& OutValue, FString& OutError) const
{
    const FString* DeclaredType = DeclaredPropertyTypes.Find(PropertyName);
    if (DeclaredType == nullptr || DeclaredType->TrimStartAndEnd().IsEmpty())
    {
        OutValue = InValue;
        return true;
    }

    return CoerceValueAsType(*DeclaredType, InValue, OutValue, OutError);
}

bool UURenderBridgeSubsystem::CoerceValueAsType(const FString& TypeName, const TSharedPtr<FJsonValue>& InValue, TSharedPtr<FJsonValue>& OutValue, FString& OutError) const
{
    if (!InValue.IsValid())
    {
        OutError = TEXT("input value is null");
        return false;
    }

    const FString NormalizedType = NormalizeTypeName(TypeName);
    if (NormalizedType.EndsWith(TEXT("[]")))
    {
        if (InValue->Type != EJson::Array)
        {
            OutError = FString::Printf(TEXT("expected array for type '%s'"), *TypeName);
            return false;
        }

        const FString ElementType = NormalizedType.LeftChop(2);
        TArray<TSharedPtr<FJsonValue>> OutArray;
        for (const TSharedPtr<FJsonValue>& Element : InValue->AsArray())
        {
            TSharedPtr<FJsonValue> CoercedElement;
            if (!CoerceValueAsType(ElementType, Element, CoercedElement, OutError))
            {
                return false;
            }
            OutArray.Add(CoercedElement);
        }

        OutValue = MakeShared<FJsonValueArray>(OutArray);
        return true;
    }

    if (NormalizedType == TEXT("string") || NormalizedType == TEXT("text") || NormalizedType == TEXT("name"))
    {
        switch (InValue->Type)
        {
        case EJson::String:
            OutValue = InValue;
            return true;
        case EJson::Boolean:
            OutValue = MakeShared<FJsonValueString>(InValue->AsBool() ? TEXT("true") : TEXT("false"));
            return true;
        case EJson::Number:
            OutValue = MakeShared<FJsonValueString>(LexToString(InValue->AsNumber()));
            return true;
        default:
            OutError = TEXT("cannot coerce complex json value to string");
            return false;
        }
    }

    if (NormalizedType == TEXT("bool") || NormalizedType == TEXT("boolean"))
    {
        bool bValue = false;
        if (!JsonValueToBool(InValue, bValue))
        {
            OutError = TEXT("expected boolean, numeric 0/1, or string true/false");
            return false;
        }
        OutValue = MakeShared<FJsonValueBoolean>(bValue);
        return true;
    }

    if (NormalizedType == TEXT("int") || NormalizedType == TEXT("int32") || NormalizedType == TEXT("int64"))
    {
        double Number = 0.0;
        if (!JsonValueToNumber(InValue, Number))
        {
            OutError = TEXT("expected integer-compatible value");
            return false;
        }

        const double Rounded = FMath::RoundToDouble(Number);
        if (!FMath::IsNearlyEqual(Number, Rounded, KINDA_SMALL_NUMBER))
        {
            OutError = TEXT("integer coercion refused because value is not integral");
            return false;
        }

        OutValue = MakeShared<FJsonValueNumber>(Rounded);
        return true;
    }

    if (NormalizedType == TEXT("float") || NormalizedType == TEXT("double") || NormalizedType == TEXT("number"))
    {
        double Number = 0.0;
        if (!JsonValueToNumber(InValue, Number))
        {
            OutError = TEXT("expected numeric value");
            return false;
        }

        OutValue = MakeShared<FJsonValueNumber>(Number);
        return true;
    }

    if (NormalizedType == TEXT("object") || NormalizedType == TEXT("struct") || NormalizedType == TEXT("json"))
    {
        if (InValue->Type != EJson::Object)
        {
            OutError = TEXT("expected json object");
            return false;
        }

        OutValue = InValue;
        return true;
    }

    if (NormalizedType == TEXT("color") || NormalizedType == TEXT("linearcolor") || NormalizedType == TEXT("flinearcolor"))
    {
        double R = 0.0;
        double G = 0.0;
        double B = 0.0;
        double A = 1.0;

        if (InValue->Type == EJson::String)
        {
            if (!TryParseHexColorToLinear(InValue->AsString(), R, G, B, A))
            {
                OutError = TEXT("expected hex color string like #RRGGBB or #RRGGBBAA");
                return false;
            }
        }
        else if (InValue->Type == EJson::Object)
        {
            TSharedPtr<FJsonObject> ObjectValue = InValue->AsObject();
            if (!TryGetCaseInsensitiveNumberField(ObjectValue, TEXT("R"), R) ||
                !TryGetCaseInsensitiveNumberField(ObjectValue, TEXT("G"), G) ||
                !TryGetCaseInsensitiveNumberField(ObjectValue, TEXT("B"), B))
            {
                OutError = TEXT("expected object with R,G,B[,A] fields");
                return false;
            }
            if (!TryGetCaseInsensitiveNumberField(ObjectValue, TEXT("A"), A))
            {
                A = 1.0;
            }
            if (R > 1.0 || G > 1.0 || B > 1.0 || A > 1.0)
            {
                R /= 255.0;
                G /= 255.0;
                B /= 255.0;
                A /= 255.0;
            }
        }
        else if (InValue->Type == EJson::Array)
        {
            const TArray<TSharedPtr<FJsonValue>>& ArrayValue = InValue->AsArray();
            if (ArrayValue.Num() != 3 && ArrayValue.Num() != 4)
            {
                OutError = TEXT("expected [R,G,B] or [R,G,B,A] array");
                return false;
            }
            if (!JsonValueToNumber(ArrayValue[0], R) || !JsonValueToNumber(ArrayValue[1], G) || !JsonValueToNumber(ArrayValue[2], B))
            {
                OutError = TEXT("color array contains non-numeric values");
                return false;
            }
            if (ArrayValue.Num() == 4 && !JsonValueToNumber(ArrayValue[3], A))
            {
                OutError = TEXT("alpha component is not numeric");
                return false;
            }
            if (R > 1.0 || G > 1.0 || B > 1.0 || A > 1.0)
            {
                R /= 255.0;
                G /= 255.0;
                B /= 255.0;
                A /= 255.0;
            }
        }
        else
        {
            OutError = TEXT("expected color as hex string, object, or array");
            return false;
        }

        TSharedRef<FJsonObject> ColorObject = MakeShared<FJsonObject>();
        ColorObject->SetNumberField(TEXT("R"), R);
        ColorObject->SetNumberField(TEXT("G"), G);
        ColorObject->SetNumberField(TEXT("B"), B);
        ColorObject->SetNumberField(TEXT("A"), A);
        OutValue = MakeShared<FJsonValueObject>(ColorObject);
        return true;
    }

    if (NormalizedType == TEXT("vector2") || NormalizedType == TEXT("vector2d") || NormalizedType == TEXT("fvector2d"))
    {
        double X = 0.0;
        double Y = 0.0;

        if (InValue->Type == EJson::Array)
        {
            const TArray<TSharedPtr<FJsonValue>>& ArrayValue = InValue->AsArray();
            if (ArrayValue.Num() != 2 || !JsonValueToNumber(ArrayValue[0], X) || !JsonValueToNumber(ArrayValue[1], Y))
            {
                OutError = TEXT("expected vector2 array [X,Y]");
                return false;
            }
        }
        else if (InValue->Type == EJson::Object)
        {
            TSharedPtr<FJsonObject> ObjectValue = InValue->AsObject();
            if (!TryGetCaseInsensitiveNumberField(ObjectValue, TEXT("X"), X) || !TryGetCaseInsensitiveNumberField(ObjectValue, TEXT("Y"), Y))
            {
                OutError = TEXT("expected object with X,Y fields");
                return false;
            }
        }
        else
        {
            OutError = TEXT("expected vector2 as object or array");
            return false;
        }

        TSharedRef<FJsonObject> VectorObject = MakeShared<FJsonObject>();
        VectorObject->SetNumberField(TEXT("X"), X);
        VectorObject->SetNumberField(TEXT("Y"), Y);
        OutValue = MakeShared<FJsonValueObject>(VectorObject);
        return true;
    }

    if (NormalizedType == TEXT("vector") || NormalizedType == TEXT("vector3") || NormalizedType == TEXT("fvector"))
    {
        double X = 0.0;
        double Y = 0.0;
        double Z = 0.0;

        if (InValue->Type == EJson::Array)
        {
            const TArray<TSharedPtr<FJsonValue>>& ArrayValue = InValue->AsArray();
            if (ArrayValue.Num() != 3 || !JsonValueToNumber(ArrayValue[0], X) || !JsonValueToNumber(ArrayValue[1], Y) || !JsonValueToNumber(ArrayValue[2], Z))
            {
                OutError = TEXT("expected vector3 array [X,Y,Z]");
                return false;
            }
        }
        else if (InValue->Type == EJson::Object)
        {
            TSharedPtr<FJsonObject> ObjectValue = InValue->AsObject();
            if (!TryGetCaseInsensitiveNumberField(ObjectValue, TEXT("X"), X) ||
                !TryGetCaseInsensitiveNumberField(ObjectValue, TEXT("Y"), Y) ||
                !TryGetCaseInsensitiveNumberField(ObjectValue, TEXT("Z"), Z))
            {
                OutError = TEXT("expected object with X,Y,Z fields");
                return false;
            }
        }
        else
        {
            OutError = TEXT("expected vector3 as object or array");
            return false;
        }

        TSharedRef<FJsonObject> VectorObject = MakeShared<FJsonObject>();
        VectorObject->SetNumberField(TEXT("X"), X);
        VectorObject->SetNumberField(TEXT("Y"), Y);
        VectorObject->SetNumberField(TEXT("Z"), Z);
        OutValue = MakeShared<FJsonValueObject>(VectorObject);
        return true;
    }

    if (NormalizedType == TEXT("rotator") || NormalizedType == TEXT("frotator"))
    {
        double Pitch = 0.0;
        double Yaw = 0.0;
        double Roll = 0.0;

        if (InValue->Type == EJson::Array)
        {
            const TArray<TSharedPtr<FJsonValue>>& ArrayValue = InValue->AsArray();
            if (ArrayValue.Num() != 3 || !JsonValueToNumber(ArrayValue[0], Pitch) || !JsonValueToNumber(ArrayValue[1], Yaw) || !JsonValueToNumber(ArrayValue[2], Roll))
            {
                OutError = TEXT("expected rotator array [Pitch,Yaw,Roll]");
                return false;
            }
        }
        else if (InValue->Type == EJson::Object)
        {
            TSharedPtr<FJsonObject> ObjectValue = InValue->AsObject();
            if (!TryGetCaseInsensitiveNumberField(ObjectValue, TEXT("Pitch"), Pitch) ||
                !TryGetCaseInsensitiveNumberField(ObjectValue, TEXT("Yaw"), Yaw) ||
                !TryGetCaseInsensitiveNumberField(ObjectValue, TEXT("Roll"), Roll))
            {
                OutError = TEXT("expected object with Pitch,Yaw,Roll fields");
                return false;
            }
        }
        else
        {
            OutError = TEXT("expected rotator as object or array");
            return false;
        }

        TSharedRef<FJsonObject> RotatorObject = MakeShared<FJsonObject>();
        RotatorObject->SetNumberField(TEXT("Pitch"), Pitch);
        RotatorObject->SetNumberField(TEXT("Yaw"), Yaw);
        RotatorObject->SetNumberField(TEXT("Roll"), Roll);
        OutValue = MakeShared<FJsonValueObject>(RotatorObject);
        return true;
    }

    OutError = FString::Printf(TEXT("unsupported declared type '%s'"), *TypeName);
    return false;
}

bool UURenderBridgeSubsystem::JsonValueToNumber(const TSharedPtr<FJsonValue>& InValue, double& OutNumber) const
{
    if (!InValue.IsValid())
    {
        return false;
    }

    if (InValue->Type == EJson::Number)
    {
        OutNumber = InValue->AsNumber();
        return true;
    }

    if (InValue->Type == EJson::String)
    {
        return FDefaultValueHelper::ParseDouble(InValue->AsString(), OutNumber);
    }

    if (InValue->Type == EJson::Boolean)
    {
        OutNumber = InValue->AsBool() ? 1.0 : 0.0;
        return true;
    }

    return false;
}

bool UURenderBridgeSubsystem::JsonValueToBool(const TSharedPtr<FJsonValue>& InValue, bool& bOutBool) const
{
    if (!InValue.IsValid())
    {
        return false;
    }

    if (InValue->Type == EJson::Boolean)
    {
        bOutBool = InValue->AsBool();
        return true;
    }

    if (InValue->Type == EJson::Number)
    {
        const double Number = InValue->AsNumber();
        if (FMath::IsNearlyEqual(Number, 0.0, KINDA_SMALL_NUMBER))
        {
            bOutBool = false;
            return true;
        }
        if (FMath::IsNearlyEqual(Number, 1.0, KINDA_SMALL_NUMBER))
        {
            bOutBool = true;
            return true;
        }
        return false;
    }

    if (InValue->Type == EJson::String)
    {
        const FString Lower = InValue->AsString().TrimStartAndEnd().ToLower();
        if (Lower == TEXT("true") || Lower == TEXT("1"))
        {
            bOutBool = true;
            return true;
        }
        if (Lower == TEXT("false") || Lower == TEXT("0"))
        {
            bOutBool = false;
            return true;
        }
    }

    return false;
}

bool UURenderBridgeSubsystem::JsonValueToObject(const TSharedPtr<FJsonValue>& InValue, TSharedPtr<FJsonObject>& OutObject) const
{
    if (!InValue.IsValid() || InValue->Type != EJson::Object)
    {
        return false;
    }

    OutObject = InValue->AsObject();
    return OutObject.IsValid();
}

void UURenderBridgeSubsystem::StartBridge()
{
    StartTimestampSeconds = FPlatformTime::Seconds();
    CurrentIndex = 0;
    StartupAttemptCount = 0;
    Phase = EBridgePhase::WaitingForRemoteControl;

    while (RemoteControlBaseUrl.EndsWith(TEXT("/")))
    {
        RemoteControlBaseUrl.LeftChopInline(1, EAllowShrinking::No);
    }

    LogEvent(ELogVerbosity::Log, TEXT("startup"), FString::Printf(TEXT("Bridge start with %d field(s)."), PendingUpdates.Num()));
    ScheduleNext(InitialDelaySeconds, [this]()
    {
        ProbeRemoteControlInfo();
    });
}

void UURenderBridgeSubsystem::ProbeRemoteControlInfo()
{
    CancelActiveRequest();

    TSharedRef<IHttpRequest, ESPMode::ThreadSafe> Request = FHttpModule::Get().CreateRequest();
    Request->SetURL(RemoteControlBaseUrl + TEXT("/remote/info"));
    Request->SetVerb(TEXT("GET"));
    Request->SetHeader(TEXT("Accept"), TEXT("application/json"));
    Request->SetTimeout(RequestTimeoutSeconds);
    Request->OnProcessRequestComplete().BindUObject(this, &UURenderBridgeSubsystem::HandleRemoteControlInfoResponse);

    ActiveRequest = Request;
    if (!Request->ProcessRequest())
    {
        ActiveRequest.Reset();

        ++StartupAttemptCount;
        if (IsStartupTimedOut())
        {
            FailBridge(TEXT("RC_UNAVAILABLE"), TEXT("Remote Control probe could not start before timeout."));
            return;
        }

        LogEvent(ELogVerbosity::Warning, TEXT("rc_probe_retry"), TEXT("Remote Control probe could not start. Will retry."), nullptr, 0, StartupAttemptCount);
        ScheduleNext(GetRetryDelaySeconds(StartupAttemptCount), [this]()
        {
            ProbeRemoteControlInfo();
        });
    }
}

void UURenderBridgeSubsystem::HandleRemoteControlInfoResponse(FHttpRequestPtr Request, FHttpResponsePtr Response, bool bWasSuccessful)
{
    ActiveRequest.Reset();

    const int32 HttpCode = Response.IsValid() ? Response->GetResponseCode() : 0;
    const bool bHttpOk = bWasSuccessful && Response.IsValid() && EHttpResponseCodes::IsOk(HttpCode);

    if (bHttpOk)
    {
        StartupAttemptCount = 0;
        Phase = EBridgePhase::WaitingForPreset;
        LogEvent(ELogVerbosity::Log, TEXT("rc_probe_ok"), TEXT("Remote Control is reachable."), nullptr, HttpCode);
        ScheduleNext(0.01f, [this]()
        {
            ProbePreset();
        });
        return;
    }

    ++StartupAttemptCount;
    if (IsStartupTimedOut())
    {
        FailBridge(TEXT("RC_UNAVAILABLE"), FString::Printf(TEXT("Remote Control did not become available. Last HTTP code: %d."), HttpCode), FString(), HttpCode);
        return;
    }

    LogEvent(ELogVerbosity::Warning, TEXT("rc_probe_retry"), TEXT("Remote Control not ready yet. Will retry."), nullptr, HttpCode, StartupAttemptCount);
    ScheduleNext(GetRetryDelaySeconds(StartupAttemptCount), [this]()
    {
        ProbeRemoteControlInfo();
    });
}

void UURenderBridgeSubsystem::ProbePreset()
{
    CancelActiveRequest();

    TSharedRef<IHttpRequest, ESPMode::ThreadSafe> Request = FHttpModule::Get().CreateRequest();
    Request->SetURL(FString::Printf(TEXT("%s/remote/preset/%s"), *RemoteControlBaseUrl, *UrlEncode(PresetName)));
    Request->SetVerb(TEXT("GET"));
    Request->SetHeader(TEXT("Accept"), TEXT("application/json"));
    Request->SetTimeout(RequestTimeoutSeconds);
    Request->OnProcessRequestComplete().BindUObject(this, &UURenderBridgeSubsystem::HandlePresetResponse);

    ActiveRequest = Request;
    if (!Request->ProcessRequest())
    {
        ActiveRequest.Reset();

        ++StartupAttemptCount;
        if (IsStartupTimedOut())
        {
            FailBridge(TEXT("RC_PRESET_NOT_FOUND"), TEXT("Preset probe could not start before timeout."));
            return;
        }

        LogEvent(ELogVerbosity::Warning, TEXT("preset_probe_retry"), TEXT("Preset probe could not start. Will retry."), nullptr, 0, StartupAttemptCount);
        ScheduleNext(GetRetryDelaySeconds(StartupAttemptCount), [this]()
        {
            ProbePreset();
        });
    }
}

void UURenderBridgeSubsystem::HandlePresetResponse(FHttpRequestPtr Request, FHttpResponsePtr Response, bool bWasSuccessful)
{
    ActiveRequest.Reset();

    const int32 HttpCode = Response.IsValid() ? Response->GetResponseCode() : 0;
    const bool bHttpOk = bWasSuccessful && Response.IsValid() && EHttpResponseCodes::IsOk(HttpCode);

    if (bHttpOk)
    {
        StartupAttemptCount = 0;
        LogEvent(ELogVerbosity::Log, TEXT("preset_probe_ok"), TEXT("Preset is reachable."), nullptr, HttpCode);
        ScheduleNext(0.01f, [this]()
        {
            BeginApplyingProperties();
        });
        return;
    }

    ++StartupAttemptCount;
    if (IsStartupTimedOut())
    {
        FailBridge(TEXT("RC_PRESET_NOT_FOUND"), FString::Printf(TEXT("Preset '%s' was not reachable before timeout."), *PresetName), FString(), HttpCode);
        return;
    }

    LogEvent(ELogVerbosity::Warning, TEXT("preset_probe_retry"), TEXT("Preset not ready yet. Will retry."), nullptr, HttpCode, StartupAttemptCount);
    ScheduleNext(GetRetryDelaySeconds(StartupAttemptCount), [this]()
    {
        ProbePreset();
    });
}

void UURenderBridgeSubsystem::BeginApplyingProperties()
{
    Phase = EBridgePhase::ApplyingFields;
    ProcessCurrentProperty();
}

void UURenderBridgeSubsystem::ProcessCurrentProperty()
{
    if (CurrentIndex >= PendingUpdates.Num())
    {
        SignalReadyToRender();
        return;
    }

    CancelActiveRequest();

    FPendingPropertyUpdate& Update = PendingUpdates[CurrentIndex];
    const int32 AttemptNumber = Update.AttemptCount + 1;

    const FString Url = FString::Printf(
        TEXT("%s/remote/preset/%s/property/%s"),
        *RemoteControlBaseUrl,
        *UrlEncode(PresetName),
        *UrlEncode(Update.PropertyName)
    );

    TSharedRef<FJsonObject> Body = MakeShared<FJsonObject>();
    Body->SetField(TEXT("PropertyValue"), Update.PropertyValue);
    Body->SetBoolField(TEXT("GenerateTransaction"), bGenerateTransaction);

    FString BodyJson;
    {
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&BodyJson);
        FJsonSerializer::Serialize(Body, Writer);
    }

    TSharedRef<IHttpRequest, ESPMode::ThreadSafe> Request = FHttpModule::Get().CreateRequest();
    Request->SetURL(Url);
    Request->SetVerb(TEXT("PUT"));
    Request->SetHeader(TEXT("Content-Type"), TEXT("application/json"));
    Request->SetTimeout(RequestTimeoutSeconds);
    Request->SetContentAsString(BodyJson);
    Request->OnProcessRequestComplete().BindUObject(this, &UURenderBridgeSubsystem::HandlePropertyResponse);

    ActiveRequest = Request;
    LogEvent(ELogVerbosity::Verbose, TEXT("property_apply"), SerializeJsonValue(Update.PropertyValue), &Update.PropertyName, 0, AttemptNumber);

    if (!Request->ProcessRequest())
    {
        ActiveRequest.Reset();
        ++Update.AttemptCount;

        if (IsStartupTimedOut())
        {
            FailBridge(TEXT("RC_UNAVAILABLE"), TEXT("Property request could not start before timeout."), Update.PropertyName);
            return;
        }

        if (Update.AttemptCount <= MaxRetriesPerField)
        {
            LogEvent(ELogVerbosity::Warning, TEXT("property_retry"), TEXT("Property request did not start. Will retry."), &Update.PropertyName, 0, Update.AttemptCount);
            ScheduleNext(GetRetryDelaySeconds(Update.AttemptCount), [this]()
            {
                ProcessCurrentProperty();
            });
            return;
        }

        if (bContinueOnFieldFailure)
        {
            LogEvent(ELogVerbosity::Error, TEXT("property_skip"), TEXT("Property request could not start and will be skipped."), &Update.PropertyName, 0, Update.AttemptCount);
            ++CurrentIndex;
            ScheduleNext(0.01f, [this]()
            {
                ProcessCurrentProperty();
            });
            return;
        }

        FailBridge(TEXT("RC_PROPERTY_SET_FAILED"), TEXT("Property request could not start."), Update.PropertyName);
    }
}

void UURenderBridgeSubsystem::HandlePropertyResponse(FHttpRequestPtr Request, FHttpResponsePtr Response, bool bWasSuccessful)
{
    ActiveRequest.Reset();

    if (CurrentIndex >= PendingUpdates.Num())
    {
        return;
    }

    FPendingPropertyUpdate& Update = PendingUpdates[CurrentIndex];
    const int32 HttpCode = Response.IsValid() ? Response->GetResponseCode() : 0;
    const FString ResponseBody = GetResponseBody(Response);
    const bool bHttpOk = bWasSuccessful && Response.IsValid() && EHttpResponseCodes::IsOk(HttpCode);

    if (bHttpOk)
    {
        LogEvent(ELogVerbosity::Log, TEXT("property_ok"), TEXT("Property applied."), &Update.PropertyName, HttpCode, Update.AttemptCount + 1);
        Update.AttemptCount = 0;
        ++CurrentIndex;
        ScheduleNext(0.01f, [this]()
        {
            ProcessCurrentProperty();
        });
        return;
    }

    ++Update.AttemptCount;
    const bool bBindingNotReady = ResponseLooksLikeBindingNotReady(ResponseBody);
    const bool bRetryable = bBindingNotReady || IsRetriableHttpCode(HttpCode) || !bWasSuccessful;

    if (!IsStartupTimedOut() && bRetryable && Update.AttemptCount <= MaxRetriesPerField)
    {
        LogEvent(ELogVerbosity::Warning, bBindingNotReady ? TEXT("binding_not_ready") : TEXT("property_retry"), ResponseBody, &Update.PropertyName, HttpCode, Update.AttemptCount);
        ScheduleNext(GetRetryDelaySeconds(Update.AttemptCount), [this]()
        {
            ProcessCurrentProperty();
        });
        return;
    }

    const FString ErrorCode = bBindingNotReady
        ? TEXT("RC_PROPERTY_NOT_BOUND")
        : (ResponseLooksLikeTypeMismatch(ResponseBody) ? TEXT("RC_PROPERTY_TYPE_MISMATCH") : TEXT("RC_PROPERTY_SET_FAILED"));

    if (bContinueOnFieldFailure)
    {
        LogEvent(ELogVerbosity::Error, TEXT("property_skip"), ResponseBody, &Update.PropertyName, HttpCode, Update.AttemptCount);
        ++CurrentIndex;
        ScheduleNext(0.01f, [this]()
        {
            ProcessCurrentProperty();
        });
        return;
    }

    FailBridge(ErrorCode, ResponseBody.IsEmpty() ? TEXT("Property application failed.") : ResponseBody, Update.PropertyName, HttpCode);
}

void UURenderBridgeSubsystem::HandlePostLoadMap(UWorld* LoadedWorld)
{
    if (LoadedWorld == nullptr)
    {
        return;
    }

    const FString LoadedWorldName = LoadedWorld ? LoadedWorld->GetName() : TEXT("null");
    LogEvent(ELogVerbosity::Log, TEXT("map_loaded"), FString(TEXT("PostLoadMapWithWorld received for '")) + LoadedWorldName + TEXT("'"));

    if (!bOutputOverridesApplied)
    {
        ApplyRenderOutputOverrides();
    }

    if (Phase == EBridgePhase::WaitingForPreset)
    {
        ScheduleNext(0.01f, [this]()
        {
            ProbePreset();
        });
    }
    else if (Phase == EBridgePhase::ApplyingFields && CurrentIndex < PendingUpdates.Num())
    {
        ScheduleNext(0.01f, [this]()
        {
            ProcessCurrentProperty();
        });
    }
}

void UURenderBridgeSubsystem::SignalReadyToRender()
{
    Phase = EBridgePhase::Completed;
    LogEvent(ELogVerbosity::Log, TEXT("ready_to_render"), FString::Printf(TEXT("All %d field(s) were applied. Bridge is ready for render trigger."), PendingUpdates.Num()));
}

void UURenderBridgeSubsystem::ScheduleNext(float DelaySeconds, TFunction<void()>&& InCallback)
{
    ClearTicker();

    TWeakObjectPtr<UURenderBridgeSubsystem> WeakThis(this);
    TSharedRef<TFunction<void()>, ESPMode::ThreadSafe> CallbackRef = MakeShared<TFunction<void()>>(MoveTemp(InCallback));

    TickerHandle = FTSTicker::GetCoreTicker().AddTicker(
        FTickerDelegate::CreateLambda([WeakThis, CallbackRef](float)
        {
            if (WeakThis.IsValid())
            {
                (*CallbackRef)();
            }
            return false;
        }),
        FMath::Max(0.01f, DelaySeconds)
    );
}

void UURenderBridgeSubsystem::ClearTicker()
{
    if (TickerHandle.IsValid())
    {
        FTSTicker::GetCoreTicker().RemoveTicker(TickerHandle);
        TickerHandle.Reset();
    }
}

void UURenderBridgeSubsystem::CancelActiveRequest()
{
    if (ActiveRequest.IsValid())
    {
        ActiveRequest->OnProcessRequestComplete().Unbind();
        ActiveRequest->CancelRequest();
        ActiveRequest.Reset();
    }
}

void UURenderBridgeSubsystem::FailBridge(const FString& ErrorCode, const FString& Message, const FString& PropertyName, int32 HttpCode)
{
    Phase = EBridgePhase::Failed;

    if (PropertyName.IsEmpty())
    {
        LogEvent(ELogVerbosity::Error, ErrorCode, Message, nullptr, HttpCode);
    }
    else
    {
        LogEvent(ELogVerbosity::Error, ErrorCode, Message, &PropertyName, HttpCode);
    }

    CancelActiveRequest();
    ClearTicker();
}

bool UURenderBridgeSubsystem::IsStartupTimedOut() const
{
    return StartTimestampSeconds > 0.0 && (FPlatformTime::Seconds() - StartTimestampSeconds) >= static_cast<double>(StartupTimeoutSeconds);
}

bool UURenderBridgeSubsystem::IsRetriableHttpCode(int32 HttpCode) const
{
    return HttpCode == 0 || HttpCode == 408 || HttpCode == 425 || HttpCode == 429 || HttpCode >= 500;
}

bool UURenderBridgeSubsystem::ResponseLooksLikeBindingNotReady(const FString& ResponseBody) const
{
    const FString Lower = ResponseBody.ToLower();
    return Lower.Contains(TEXT("not bound to any object")) || Lower.Contains(TEXT("bound to an object")) == false && Lower.Contains(TEXT("not bound"));
}

bool UURenderBridgeSubsystem::ResponseLooksLikeTypeMismatch(const FString& ResponseBody) const
{
    const FString Lower = ResponseBody.ToLower();
    return Lower.Contains(TEXT("type mismatch")) || Lower.Contains(TEXT("cannot deserialize")) || Lower.Contains(TEXT("failed to import"));
}

float UURenderBridgeSubsystem::GetRetryDelaySeconds(int32 AttemptCount) const
{
    const float Multiplier = FMath::Pow(2.0f, static_cast<float>(FMath::Max(0, AttemptCount - 1)));
    return FMath::Min(MaxRetryDelaySeconds, RetryDelaySeconds * Multiplier);
}

FString UURenderBridgeSubsystem::UrlEncode(const FString& InValue) const
{
    return FGenericPlatformHttp::UrlEncode(InValue);
}

FString UURenderBridgeSubsystem::SerializeJsonValue(const TSharedPtr<FJsonValue>& InValue) const
{
    if (!InValue.IsValid())
    {
        return TEXT("null");
    }

    FString Out;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Out);
    FJsonSerializer::Serialize(InValue.ToSharedRef(), TEXT(""), Writer);
    return Out;
}

FString UURenderBridgeSubsystem::GetResponseBody(const FHttpResponsePtr& Response) const
{
    return Response.IsValid() ? Response->GetContentAsString() : TEXT("<no response>");
}

FString UURenderBridgeSubsystem::GetPhaseName() const
{
    switch (Phase)
    {
    case EBridgePhase::Idle:
        return TEXT("Idle");
    case EBridgePhase::WaitingForRemoteControl:
        return TEXT("WaitingForRemoteControl");
    case EBridgePhase::WaitingForPreset:
        return TEXT("WaitingForPreset");
    case EBridgePhase::ApplyingFields:
        return TEXT("ApplyingFields");
    case EBridgePhase::Completed:
        return TEXT("Completed");
    case EBridgePhase::Failed:
        return TEXT("Failed");
    default:
        return TEXT("Unknown");
    }
}

void UURenderBridgeSubsystem::LogEvent(ELogVerbosity::Type Verbosity, const FString& EventName, const FString& Message, const FString* PropertyName, int32 HttpCode, int32 Attempt) const
{
    FString Prefix = FString::Printf(
        TEXT("[job=%s] [form=%s] [preset=%s] [phase=%s] [event=%s]"),
        JobId.IsEmpty() ? TEXT("unknown") : *JobId,
        FormId.IsEmpty() ? TEXT("unknown") : *FormId,
        *PresetName,
        *GetPhaseName(),
        *EventName
    );

    if (PropertyName != nullptr)
    {
        Prefix += FString::Printf(TEXT(" [property=%s]"), **PropertyName);
    }

    if (HttpCode > 0)
    {
        Prefix += FString::Printf(TEXT(" [http=%d]"), HttpCode);
    }

    if (Attempt != INDEX_NONE)
    {
        Prefix += FString::Printf(TEXT(" [attempt=%d]"), Attempt);
    }

    switch (Verbosity)
    {
    case ELogVerbosity::Fatal:
        UE_LOG(LogUURenderBridge, Fatal, TEXT("%s %s"), *Prefix, *Message);
        break;

    case ELogVerbosity::Error:
        UE_LOG(LogUURenderBridge, Error, TEXT("%s %s"), *Prefix, *Message);
        break;

    case ELogVerbosity::Warning:
        UE_LOG(LogUURenderBridge, Warning, TEXT("%s %s"), *Prefix, *Message);
        break;

    case ELogVerbosity::Display:
        UE_LOG(LogUURenderBridge, Display, TEXT("%s %s"), *Prefix, *Message);
        break;

    case ELogVerbosity::Verbose:
        UE_LOG(LogUURenderBridge, Verbose, TEXT("%s %s"), *Prefix, *Message);
        break;

    case ELogVerbosity::VeryVerbose:
        UE_LOG(LogUURenderBridge, VeryVerbose, TEXT("%s %s"), *Prefix, *Message);
        break;

    case ELogVerbosity::Log:
    default:
        UE_LOG(LogUURenderBridge, Log, TEXT("%s %s"), *Prefix, *Message);
        break;
    }
}
